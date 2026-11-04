// Runtime test: runs the real workflows inside a real n8n (CLI, temporary SQLite database).
// External nodes (Google Sheets, HTTP/LLM/Meta, WhatsApp, Telegram, email) are replaced by Code
// nodes with the SAME NAME that return fake data, so every $('Node') reference, IF branch,
// paired item, executeOnce and the inlined Code-node logic runs exactly as in production.
//
//   N8N_BIN=/path/to/node_modules/.bin/n8n node marketing-agent/scripts/runtime-test.mjs [filter]
//
// Needs n8n 2.x (Node.js 24+ on PATH). Skips (exit 0) when N8N_BIN is not set.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = new URL('..', import.meta.url).pathname;
const N8N_BIN = process.env.N8N_BIN;
const FILTER = process.argv[2] || '';
if (!N8N_BIN || !existsSync(N8N_BIN)) {
  console.log('SKIP runtime test: set N8N_BIN to an n8n executable (see TEST-PLAN.md).');
  process.exit(0);
}

const requireLib = createRequire(import.meta.url);
const { formatMyt } = requireLib('../src/lib/dates.cjs');
const n8nRequire = createRequire(join(dirname(N8N_BIN), '..', 'n8n', 'package.json'));
const sqlite3 = n8nRequire('sqlite3');
const { parse } = n8nRequire('flatted');

const WA = '60100000001';
const now = new Date();
const hoursAgo = (h) => formatMyt(new Date(now.getTime() - h * 3600000));
const config = (over = {}) => Object.entries({ WHATSAPP_NUMBER: WA, ...over }).map(([key, value]) => ({ key, value }));
const json = (value) => JSON.stringify(value);
const returnItems = (items) => `return ${json(items.map((j) => ({ json: j })))};`;
const chatResponse = (object) => ({ choices: [{ message: { role: 'assistant', content: JSON.stringify(object) } }] });

// ---------- workflow surgery ----------
function loadWorkflow(file) {
  return JSON.parse(readFileSync(join(ROOT, 'workflows', file), 'utf8'));
}

function toCode(wf, name, jsCode) {
  const n = wf.nodes.find((x) => x.name === name);
  if (!n) throw new Error(`stub target "${name}" not found`);
  n.type = 'n8n-nodes-base.code';
  n.typeVersion = 2;
  n.parameters = { jsCode };
  delete n.credentials;
  delete n.webhookId;
  delete n.retryOnFail;
}

/** Replace trigger `name` by a Manual Trigger, followed by a fixture node if `items` given. Other triggers are removed. */
function startFrom(wf, name, items) {
  for (const t of wf.nodes.filter((n) => /trigger$/i.test(n.type) && n.name !== name)) {
    wf.nodes = wf.nodes.filter((n) => n !== t);
    delete wf.connections[t.name];
  }
  const t = wf.nodes.find((n) => n.name === name);
  t.type = 'n8n-nodes-base.manualTrigger';
  t.typeVersion = 1;
  t.parameters = {};
  delete t.credentials;
  delete t.webhookId;
  if (items) {
    const fixtureName = '__fixture';
    wf.nodes.push({ id: '00000000-0000-4000-8000-00000000f1f1', name: fixtureName, type: 'n8n-nodes-base.code', typeVersion: 2, position: [t.position[0], t.position[1] + 200], parameters: { jsCode: returnItems(items) } });
    wf.connections[fixtureName] = wf.connections[name];
    wf.connections[name] = { main: [[{ node: fixtureName, type: 'main', index: 0 }]] };
  }
}

/** Any node still holding a credential (not stubbed) would make n8n refuse to run. Make it fail loudly if reached. */
function guardUnstubbed(wf) {
  for (const n of wf.nodes) {
    if (n.credentials) toCode(wf, n.name, `throw new Error('UNSTUBBED NODE REACHED: ${n.name}');`);
  }
}

// ---------- n8n runner ----------
function n8n(args, home) {
  return execFileSync(N8N_BIN, args, {
    env: { ...process.env, N8N_USER_FOLDER: home, N8N_DIAGNOSTICS_ENABLED: 'false', N8N_ENCRYPTION_KEY: 'runtime-test-only', N8N_LOG_LEVEL: 'error', N8N_RUNNERS_ENABLED: 'true', DB_SQLITE_POOL_SIZE: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 300000,
  }).toString();
}

function lastExecution(home, workflowId) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(join(home, '.n8n', 'database.sqlite'));
    db.all(
      'select e.id, e.status, d.data from execution_entity e join execution_data d on d.executionId = e.id where e.workflowId = ? order by e.id desc limit 1',
      [workflowId],
      (error, rows) => {
        db.close();
        if (error) return reject(error);
        if (!rows.length) return reject(new Error('no execution saved'));
        const data = parse(rows[0].data);
        const runData = data.resultData.runData || {};
        const nodes = {};
        for (const [name, runs] of Object.entries(runData)) {
          nodes[name] = {
            error: runs[0].error ? runs[0].error.message : null,
            outputs: (runs[0].data && runs[0].data.main ? runs[0].data.main : []).map((o) => (o || []).map((i) => i.json)),
            runs: runs.length,
          };
        }
        resolve({ status: rows[0].status, error: data.resultData.error ? data.resultData.error.message : null, nodes });
      },
    );
  });
}

// ---------- scenarios ----------
const scenarios = [];
const scenario = (name, file, setup, check) => scenarios.push({ name, file, setup, check });

const out = (r, node, output = 0) => (r.nodes[node] ? r.nodes[node].outputs[output] || [] : null);
function expect(cond, message) {
  if (!cond) throw new Error(message);
}

// Workflow 1 – content generator
scenario('1a generator: fake LLM writes 6 drafts needing approval', '01-content-generator.json', (wf) => {
  startFrom(wf, 'Every Friday 10:00');
  toCode(wf, 'Read config', returnItems(config()));
  toCode(wf, 'Fetch brand rules', returnItems([{ error: { message: 'Invalid URL' } }]));
  toCode(wf, 'Fetch content brief', returnItems([{ error: { message: 'Invalid URL' } }]));
  toCode(wf, 'Read posts', returnItems([{}]));
  toCode(wf, 'Save drafts (needs approval)', 'return $input.all();');
}, (r) => {
  expect(r.status === 'success', `status ${r.status}: ${r.error}`);
  const saved = out(r, 'Save drafts (needs approval)');
  expect(saved && saved.length === 6, `expected 6 saved rows, got ${saved && saved.length}`);
  expect(saved.every((row) => row.status === 'needs approval'), 'all rows need approval');
  expect(new Set(saved.map((row) => row.pitch)).size === 3, 'all three pitches used');
  expect(saved.filter((row) => row.language === 'zh').length === 3, '3 Chinese drafts');
  expect(saved.every((row) => row.text.includes(`wa.me/${WA}?text=`)), 'CTA with tracking code');
  expect(!r.nodes['Call LLM'], 'real LLM not called in fake mode');
});

scenario('1b generator: refuses to write a second set for the same week', '01-content-generator.json', (wf) => {
  startFrom(wf, 'Every Friday 10:00');
  toCode(wf, 'Read config', returnItems(config({ WEEK_OFFSET: '0' })));
  toCode(wf, 'Fetch brand rules', returnItems([{ data: 'rules' }]));
  toCode(wf, 'Fetch content brief', returnItems([{ data: 'brief' }]));
  const { isoWeekOf, weekId } = requireLib('../src/lib/dates.cjs');
  toCode(wf, 'Read posts', returnItems([{ post_id: 'x', week: weekId(isoWeekOf(now)) }]));
  toCode(wf, 'Save drafts (needs approval)', 'return $input.all();');
}, (r) => {
  expect(r.status === 'error', 'should fail');
  expect(/already exist/.test(r.nodes['Plan week'].error || ''), `Plan week error: ${r.nodes['Plan week'] && r.nodes['Plan week'].error}`);
  expect(!r.nodes['Save drafts (needs approval)'], 'nothing saved');
});

scenario('1c generator: real-LLM path parses JSON and flags banned claims', '01-content-generator.json', (wf) => {
  startFrom(wf, 'Every Friday 10:00');
  toCode(wf, 'Read config', returnItems(config({ USE_FAKE_LLM: 'FALSE', LLM_MODEL: 'test-model', BRAND_RULES_URL: 'https://x.test/b', CONTENT_BRIEF_URL: 'https://x.test/c', POST_DAYS: 'Mon', LANGUAGES: 'en,zh' })));
  toCode(wf, 'Fetch brand rules', returnItems([{ data: '# rules' }]));
  toCode(wf, 'Fetch content brief', returnItems([{ data: '# brief' }]));
  toCode(wf, 'Read posts', returnItems([{}]));
  const llm = chatResponse({ posts: [{ slot: 1, image_idea: 'demo screenshot', en: { body: 'Catch supplier fraud fast!', hashtags: ['#RetailMY'] }, zh: { body: '老板，你的货压了多少？', hashtags: ['#大马零售'] } }] });
  toCode(wf, 'Call LLM', `if (!$json.llm_request || !$json.llm_request.messages) throw new Error('no llm_request'); return ${json([{ json: llm }])};`);
  toCode(wf, 'Save drafts (needs approval)', 'return $input.all();');
}, (r) => {
  expect(r.status === 'success', `status ${r.status}: ${r.error}`);
  const saved = out(r, 'Save drafts (needs approval)');
  expect(saved.length === 2, `2 rows, got ${saved.length}`);
  expect(/BLOCK B1/.test(saved.find((x) => x.language === 'en').compliance_flags), 'fraud flagged');
  expect(saved.every((x) => x.status === 'needs approval'), 'still only a draft');
  expect(!r.nodes['Fake LLM (test)'], 'fake LLM not used');
});

// ---------- run ----------
const selected = scenarios.filter((s) => s.name.includes(FILTER));
const work = mkdtempSync(join(tmpdir(), 'rpc-n8n-'));
const home = join(work, 'home');
mkdirSync(home, { recursive: true });
let failed = 0;
try {
  selected.forEach((s, i) => {
    const wf = loadWorkflow(s.file);
    s.setup(wf);
    guardUnstubbed(wf);
    wf.id = `rt${String(i).padStart(3, '0')}${'x'.repeat(11)}`;
    wf.name = `[runtime test] ${s.name}`;
    s.id = wf.id;
    writeFileSync(join(work, `${wf.id}.json`), JSON.stringify(wf));
  });
  n8n(['import:workflow', '--separate', `--input=${work}`], home);
  for (const s of selected) {
    try {
      n8n(['execute', `--id=${s.id}`, '--rawOutput'], home);
    } catch (_) {
      // n8n's CLI often reports "No active execution found" for fast runs; the result is read from the database.
    }
    try {
      const result = await lastExecution(home, s.id);
      s.check(result);
      console.log(`PASS ${s.name}`);
    } catch (e) {
      failed += 1;
      console.log(`FAIL ${s.name}\n     ${e.message}`);
    }
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
console.log(`${selected.length - failed}/${selected.length} runtime scenarios passed`);
process.exit(failed ? 1 : 0);
