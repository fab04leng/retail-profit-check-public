// Validates the n8n workflow JSON files in marketing-agent/workflows/.
//
//   node marketing-agent/scripts/validate.mjs            (structure + schema checks)
//   node marketing-agent/scripts/validate.mjs --report   (also writes marketing-agent/VALIDATION.md)
//
// Structure checks always run: JSON parses, unique node names/ids, connections point at real
// nodes and real outputs, $('Node') references exist, Code node JavaScript compiles, credentials
// are placeholders, no secrets or personal data in marketing-agent/.
// Schema checks run for every n8n version downloaded with scripts/fetch-n8n-schema.sh: node type
// exists, typeVersion is supported, every parameter is one n8n shows for these settings (others
// would be silently dropped), option values are valid, required parameters are set, credential
// types exist and are accepted by the node. The newest downloaded version is "current": problems
// there are errors; problems in older versions are warnings.
import { readFileSync, readdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

// fileURLToPath, not URL.pathname: on Windows pathname is "/C:/…", which path functions turn into "C:\C:\…".
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const WORKFLOW_DIR = process.env.N8N_WORKFLOW_DIR || join(ROOT, 'workflows');
const SCHEMA_DIR = process.env.N8N_SCHEMA_DIR || join(ROOT, '.n8n-schema');
const WRITE_REPORT = process.argv.includes('--report');

const errors = [];
const warnings = [];
const notes = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);
const warn = (file, msg) => warnings.push(`${file}: ${msg}`);

// ---------- schema loading ----------
function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  return 0;
}

function loadSchemas() {
  if (!existsSync(SCHEMA_DIR)) return [];
  const versions = readdirSync(SCHEMA_DIR).filter((v) => /^\d+\.\d+\.\d+$/.test(v)).sort(compareVersions).reverse();
  return versions.map((version) => {
    const dir = join(SCHEMA_DIR, version);
    const read = (p) => (existsSync(join(dir, p)) ? JSON.parse(readFileSync(join(dir, p), 'utf8')) : []);
    const base = read('nodes-base/package/dist/types/nodes.json');
    const langchain = read('langchain/package/dist/types/nodes.json');
    const credentials = read('nodes-base/package/dist/types/credentials.json');
    let helpers = null;
    const wfPath = join(dir, 'wf/node_modules/n8n-workflow');
    if (existsSync(wfPath)) helpers = createRequire(join(dir, 'wf/index.js'))('n8n-workflow').NodeHelpers;
    return { version, base, langchain, credentialNames: new Set(credentials.map((c) => c.name)), helpers };
  });
}

function findDescription(schema, type, typeVersion) {
  let list;
  let name;
  if (type.startsWith('n8n-nodes-base.')) { list = schema.base; name = type.slice('n8n-nodes-base.'.length); }
  else if (type.startsWith('@n8n/n8n-nodes-langchain.')) { list = schema.langchain; name = type.slice('@n8n/n8n-nodes-langchain.'.length); }
  else return { known: false };
  const candidates = list.filter((d) => d.name === name);
  if (!candidates.length) return { known: false };
  const versions = candidates.flatMap((d) => (Array.isArray(d.version) ? d.version : [d.version]));
  const desc = candidates.find((d) => (Array.isArray(d.version) ? d.version : [d.version]).includes(typeVersion));
  return { known: true, desc, versions };
}

// ---------- helpers ----------
function walkStrings(value, fn, path = '') {
  if (typeof value === 'string') fn(value, path);
  else if (Array.isArray(value)) value.forEach((v, i) => walkStrings(v, fn, `${path}[${i}]`));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) walkStrings(v, fn, path ? `${path}.${k}` : k);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const isExpression = (v) => typeof v === 'string' && v.startsWith('=');

// ---------- structural checks ----------
function checkStructure(file, wf) {
  for (const key of ['name', 'nodes', 'connections', 'settings']) if (!(key in wf)) err(file, `missing top-level "${key}"`);
  if (!Array.isArray(wf.nodes) || !wf.nodes.length) { err(file, 'no nodes'); return; }
  if (wf.active !== false) err(file, 'workflow must be imported inactive ("active": false)');
  if (wf.settings && wf.settings.executionOrder !== 'v1') warn(file, 'settings.executionOrder is not "v1"');

  const names = new Set();
  const ids = new Set();
  for (const n of wf.nodes) {
    if (!n.name || names.has(n.name)) err(file, `duplicate or empty node name "${n.name}"`);
    names.add(n.name);
    if (!UUID.test(n.id || '') || ids.has(n.id)) err(file, `node "${n.name}" has a missing, malformed or duplicate id`);
    ids.add(n.id);
    if (!n.type || typeof n.typeVersion !== 'number') err(file, `node "${n.name}" needs type and numeric typeVersion`);
    if (!Array.isArray(n.position) || n.position.length !== 2 || !n.position.every(Number.isFinite)) err(file, `node "${n.name}" has a bad position`);
    if (typeof n.parameters !== 'object' || n.parameters === null) err(file, `node "${n.name}" has no parameters object`);
  }

  const incoming = new Map([...names].map((n) => [n, 0]));
  for (const [from, byType] of Object.entries(wf.connections || {})) {
    if (!names.has(from)) err(file, `connection from unknown node "${from}"`);
    for (const [type, outputs] of Object.entries(byType)) {
      if (type !== 'main') warn(file, `connection type "${type}" from "${from}"`);
      outputs.forEach((targets, outputIndex) => {
        for (const t of targets || []) {
          if (!names.has(t.node)) err(file, `connection "${from}" → unknown node "${t.node}"`);
          else incoming.set(t.node, incoming.get(t.node) + 1);
          if (t.type !== 'main' || t.index !== 0) warn(file, `connection "${from}" → "${t.node}" uses input ${t.type}/${t.index}`);
        }
        const node = wf.nodes.find((n) => n.name === from);
        const outputsAllowed = node && node.type === 'n8n-nodes-base.if' ? 2 : 1;
        if (outputIndex >= outputsAllowed) err(file, `"${from}" has no output ${outputIndex}`);
      });
    }
  }

  const triggers = wf.nodes.filter((n) => /trigger$/i.test(n.type));
  if (!triggers.length) err(file, 'no trigger node');
  for (const n of wf.nodes) {
    if (n.type === 'n8n-nodes-base.stickyNote') continue;
    const isTrigger = /trigger$/i.test(n.type);
    if (!isTrigger && incoming.get(n.name) === 0) err(file, `node "${n.name}" is not connected to anything upstream`);
    if (isTrigger && !(wf.connections[n.name] && wf.connections[n.name].main.some((o) => o && o.length))) err(file, `trigger "${n.name}" is not connected`);
  }

  // $('Node name') references in expressions and code must point at real nodes.
  for (const n of wf.nodes) {
    walkStrings(n.parameters, (s, path) => {
      for (const m of s.matchAll(/\$\(\s*(['"])((?:(?!\1).)+)\1\s*\)/g)) {
        if (!names.has(m[2])) err(file, `node "${n.name}" (${path}) references unknown node "${m[2]}"`);
      }
      for (const m of s.matchAll(/\$node\[\s*(['"])((?:(?!\1).)+)\1\s*\]/g)) {
        if (!names.has(m[2])) err(file, `node "${n.name}" (${path}) references unknown node "${m[2]}"`);
      }
    });
  }

  // Code node JavaScript must compile (n8n wraps it in an async function).
  for (const n of wf.nodes.filter((x) => x.type === 'n8n-nodes-base.code')) {
    const code = n.parameters.jsCode;
    if (typeof code !== 'string' || !code.trim()) { err(file, `Code node "${n.name}" has no jsCode`); continue; }
    try {
      new vm.Script(`(async function () {\n${code}\n})`, { filename: `${file}#${n.name}` });
    } catch (e) {
      err(file, `Code node "${n.name}" does not compile: ${e.message}`);
    }
    if (/\brequire\s*\(|\bmodule\.exports\b/.test(code)) err(file, `Code node "${n.name}" uses require/module (not allowed in n8n Code nodes by default)`);
  }

  // Credentials must be placeholders.
  for (const n of wf.nodes) {
    for (const [type, ref] of Object.entries(n.credentials || {})) {
      if (!ref || !/^PLACEHOLDER/.test(String(ref.id)) || !/^PLACEHOLDER/.test(String(ref.name))) err(file, `node "${n.name}" credential ${type} is not a PLACEHOLDER reference`);
    }
  }
}

// ---------- schema checks ----------
function checkAgainstSchema(file, wf, schema, isCurrent) {
  const report = isCurrent ? err : warn;
  const tag = `[n8n ${schema.version}]`;
  for (const n of wf.nodes) {
    const found = findDescription(schema, n.type, n.typeVersion);
    if (!found.known) { report(file, `${tag} node type ${n.type} does not exist`); continue; }
    if (!found.desc) { report(file, `${tag} ${n.type} has no typeVersion ${n.typeVersion} (available: ${found.versions.join(', ')})`); continue; }
    const desc = found.desc;

    if (desc.webhooks && desc.webhooks.length && !UUID.test(n.webhookId || '')) report(file, `${tag} webhook node "${n.name}" needs a webhookId`);

    // Credentials: type exists and the node accepts it.
    const accepted = new Set((desc.credentials || []).map((c) => c.name));
    const p = n.parameters || {};
    if (n.type === 'n8n-nodes-base.httpRequest') {
      if (p.authentication === 'genericCredentialType') accepted.add(p.genericAuthType);
      if (p.authentication === 'predefinedCredentialType') accepted.add(p.nodeCredentialType);
    }
    for (const type of Object.keys(n.credentials || {})) {
      if (schema.credentialNames.size && !schema.credentialNames.has(type)) report(file, `${tag} "${n.name}": credential type ${type} does not exist`);
      if (!accepted.has(type)) report(file, `${tag} "${n.name}": node does not accept credential type ${type}`);
    }

    if (!schema.helpers) continue;
    const H = schema.helpers;
    let resolved;
    try {
      resolved = H.getNodeParameters(desc.properties, p, true, false, n, desc);
    } catch (e) {
      report(file, `${tag} "${n.name}": n8n could not read its parameters (${e.message})`);
      continue;
    }
    for (const key of Object.keys(p)) {
      if (!resolved || !(key in resolved)) report(file, `${tag} "${n.name}": parameter "${key}" is not used with these settings (n8n would drop it)`);
    }
    // Static option values (a name can be defined several times with different displayOptions).
    const reportedOptions = new Set();
    for (const prop of desc.properties) {
      if (!resolved || !(prop.name in resolved) || !(prop.name in p)) continue;
      const value = p[prop.name];
      if (isExpression(value) || !Array.isArray(prop.options) || prop.typeOptions?.loadOptionsMethod) continue;
      const allowed = prop.options.map((o) => o.value);
      if (prop.type === 'options' && !allowed.includes(value)) {
        // The same name can appear in several properties with different displayOptions; only flag if no match anywhere shown.
        const alternatives = desc.properties.filter((q) => q.name === prop.name && Array.isArray(q.options)).flatMap((q) => q.options.map((o) => o.value));
        if (!alternatives.includes(value) && !reportedOptions.has(prop.name)) {
          reportedOptions.add(prop.name);
          report(file, `${tag} "${n.name}": ${prop.name} = "${value}" is not one of ${[...new Set(alternatives)].join(', ')}`);
        }
      }
      if (prop.type === 'multiOptions' && Array.isArray(value)) {
        for (const v of value) if (!allowed.includes(v)) report(file, `${tag} "${n.name}": ${prop.name} contains "${v}" (allowed: ${allowed.join(', ')})`);
      }
    }
    try {
      const issues = H.getNodeParametersIssues(desc.properties, { ...n, parameters: resolved }, desc);
      if (issues && issues.parameters) {
        for (const [param, msgs] of Object.entries(issues.parameters)) report(file, `${tag} "${n.name}": ${param}: ${msgs.join('; ')}`);
      }
    } catch (e) {
      warn(file, `${tag} "${n.name}": could not compute parameter issues (${e.message})`);
    }
  }
}

// ---------- secrets / personal data scan ----------
const SECRET_PATTERNS = [
  [/EAA[A-Za-z0-9]{30,}/, 'Meta access token'],
  [/\bsk-[A-Za-z0-9_-]{20,}/, 'OpenAI-style API key'],
  [/\b\d{8,10}:AA[A-Za-z0-9_-]{30,}/, 'Telegram bot token'],
  [/AIza[0-9A-Za-z_-]{35}/, 'Google API key'],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}/, 'GitHub token'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/"(?:apiKey|accessToken|clientSecret|appSecret|password)"\s*:\s*"(?!PLACEHOLDER)[^"]{6,}"/, 'credential value'],
];
const FAKE_NUMBER = /^6010000000\d$/;

function scanTree(dir) {
  for (const entry of readdirSync(dir)) {
    if (['.n8n-schema', 'node_modules', '.runtime-test'].includes(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) { scanTree(path); continue; }
    if (!/\.(json|md|csv|mjs|cjs|js|sh)$/.test(entry)) continue;
    const rel = relative(ROOT, path);
    if (rel === 'VALIDATION.md') continue; // generated by this script
    const text = readFileSync(path, 'utf8');
    for (const [re, label] of SECRET_PATTERNS) if (re.test(text)) err(rel, `looks like it contains a ${label}`);
    if (/scripts\/validate\.mjs$/.test(rel) || /tests\//.test(rel)) continue; // patterns and test strings
    for (const m of text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) {
      if (!/@(?:example\.(?:com|org)|anthropic\.com)$/i.test(m[0]) && !/^[\w.-]+@\d/.test(m[0])) err(rel, `email address …@${m[0].split('@')[1]} (use an @example.com placeholder)`);
    }
    for (const m of text.matchAll(/(?<![\d.])(?:\+?60|0)1[0-9][- ]?\d{3,4}[- ]?\d{4}(?![\d])/g)) {
      const digits = m[0].replace(/\D/g, '');
      const normalised = digits.startsWith('0') ? '6' + digits : digits;
      if (!FAKE_NUMBER.test(normalised)) err(rel, `phone number ${m[0].slice(0, 4)}… (use 6010000000x test numbers)`);
    }
  }
}

// ---------- run ----------
const schemas = loadSchemas();
if (!schemas.length) notes.push('No n8n schema downloaded: only structure checks ran. Run scripts/fetch-n8n-schema.sh first.');
const files = existsSync(WORKFLOW_DIR) ? readdirSync(WORKFLOW_DIR).filter((f) => f.endsWith('.json')).sort() : [];
if (!files.length) notes.push('No workflow files found yet.');
const summary = [];
for (const f of files) {
  const rel = `workflows/${f}`;
  let wf;
  try {
    wf = JSON.parse(readFileSync(join(WORKFLOW_DIR, f), 'utf8'));
  } catch (e) {
    err(rel, `invalid JSON: ${e.message}`);
    continue;
  }
  const before = errors.length;
  checkStructure(rel, wf);
  schemas.forEach((s, i) => checkAgainstSchema(rel, wf, s, i === 0));
  const types = [...new Set(wf.nodes.map((n) => `${n.type.replace('n8n-nodes-base.', '')} v${n.typeVersion}`))].sort();
  summary.push({ file: rel, name: wf.name, nodes: wf.nodes.length, ok: errors.length === before, types });
}
scanTree(ROOT);

const lines = [];
lines.push(`Checked ${files.length} workflow file(s) against n8n ${schemas.map((s, i) => s.version + (i === 0 ? ' (current)' : '') + (s.helpers ? '' : ' (types only)')).join(', ') || '(no schema)'}.`);
for (const s of summary) lines.push(`${s.ok ? 'OK  ' : 'FAIL'} ${s.file} – "${s.name}", ${s.nodes} nodes`);
for (const n of notes) lines.push(`NOTE ${n}`);
for (const w of warnings) lines.push(`WARN ${w}`);
for (const e of errors) lines.push(`ERR  ${e}`);
console.log(lines.join('\n'));

if (WRITE_REPORT) {
  const md = [
    '# Workflow validation report',
    '',
    'Generated by `node marketing-agent/scripts/validate.mjs --report`. Do not edit by hand.',
    '',
    `- n8n versions checked: ${schemas.map((s, i) => `**${s.version}**${i === 0 ? ' (current, errors)' : ' (older, warnings only)'}`).join(', ') || 'none'}`,
    `- Result: **${errors.length} errors, ${warnings.length} warnings**`,
    '',
    '| File | Workflow | Nodes | Result | Node types (version) |',
    '|---|---|---|---|---|',
    ...summary.map((s) => `| \`${s.file}\` | ${s.name} | ${s.nodes} | ${s.ok ? 'OK' : 'FAIL'} | ${s.types.join(', ')} |`),
    '',
    ...(warnings.length ? ['## Warnings', '', ...warnings.map((w) => `- ${w}`), ''] : []),
    ...(errors.length ? ['## Errors', '', ...errors.map((e) => `- ${e}`), ''] : []),
    '## What is checked',
    '',
    '- JSON parses; unique node names and UUID ids; positions; workflow imports inactive.',
    '- Every connection points at a real node and a real output; every non-trigger node is connected.',
    "- Every `$('Node name')` reference in expressions and Code nodes matches a node name.",
    '- Code node JavaScript compiles and does not use `require`.',
    '- Node type exists and the typeVersion is supported in each n8n version listed above.',
    '- Every parameter is one n8n shows for those settings (n8n silently drops others), static option values are valid, required parameters are set (n8n-workflow `NodeHelpers`).',
    '- Credential types exist and are accepted by the node; every credential reference is a PLACEHOLDER.',
    '- No secrets, real email addresses or phone numbers anywhere in `marketing-agent/` (only `@example.com` and `6010000000x` test numbers).',
    '',
    'Not checked here (see TEST-PLAN.md): behaviour against real Google, Meta, WhatsApp, Telegram and LLM APIs.',
    '',
  ].join('\n');
  writeFileSync(join(ROOT, 'VALIDATION.md'), md);
}

process.exit(errors.length ? 1 : 0);
