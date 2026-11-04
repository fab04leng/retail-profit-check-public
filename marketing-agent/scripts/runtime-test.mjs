// Runtime test: runs the real workflows inside a real n8n (CLI, temporary SQLite database).
//
// - Google Sheets, WhatsApp, Telegram and email nodes are replaced by Code nodes with the SAME
//   NAME that return fake data (they need real credentials), so every $('Node') reference,
//   IF branch, paired item, executeOnce and the inlined Code-node logic runs as in production.
// - HTTP Request nodes (LLM, Meta Graph API, brand-rule downloads) stay REAL: they are only
//   pointed at a local mock server, so their URL/body expressions and continue-on-error
//   handling are exercised too.
//
//   N8N_BIN=/path/to/node_modules/.bin/n8n node marketing-agent/scripts/runtime-test.mjs [filter]
//
// Needs n8n 2.x (Node.js 24+ on PATH). Skips (exit 0) when N8N_BIN is not set.
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
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
const { formatMyt, isoWeekOf, weekId } = requireLib('../src/lib/dates.cjs');
const n8nRequire = createRequire(join(dirname(N8N_BIN), '..', 'n8n', 'package.json'));
const sqlite3 = n8nRequire('sqlite3');
const { parse } = n8nRequire('flatted');

const WA = '60100000001';
const now = new Date();
const hoursAgo = (h) => formatMyt(new Date(now.getTime() - h * 3600000));
const json = (value) => JSON.stringify(value);
const returnItems = (items) => `return ${json(items.map((j) => ({ json: j })))};`;
const chatResponse = (object) => ({ choices: [{ message: { role: 'assistant', content: JSON.stringify(object) } }] });

// ---------- mock HTTP server (Meta Graph API, LLM, file downloads) ----------
let mockRoutes = [];
const mockLog = [];
const server = createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const url = new URL(req.url, 'http://mock');
    let parsed = body;
    try { parsed = body ? JSON.parse(body) : null; } catch (_) { /* keep text */ }
    mockLog.push({ method: req.method, path: url.pathname, body: parsed });
    const route = mockRoutes.find((r) => r.method === req.method && r.path.test(url.pathname));
    if (!route) { res.writeHead(404, { 'content-type': 'application/json' }); res.end(json({ error: { message: `no mock for ${req.method} ${url.pathname}` } })); return; }
    const reply = typeof route.reply === 'function' ? route.reply(parsed) : route.reply;
    res.writeHead(reply.status || 200, { 'content-type': reply.text !== undefined ? 'text/plain' : 'application/json' });
    res.end(reply.text !== undefined ? reply.text : json(reply.body));
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const MOCK = `http://127.0.0.1:${server.address().port}`;
const config = (over = {}) => Object.entries({ WHATSAPP_NUMBER: WA, GRAPH_API_VERSION: 'v25.0', ...over }).map(([key, value]) => ({ key, value }));

// ---------- workflow surgery ----------
const loadWorkflow = (file) => JSON.parse(readFileSync(join(ROOT, 'workflows', file), 'utf8'));
const nodeOf = (wf, name) => {
  const n = wf.nodes.find((x) => x.name === name);
  if (!n) throw new Error(`node "${name}" not found`);
  return n;
};

function toCode(wf, name, jsCode) {
  const n = nodeOf(wf, name);
  n.type = 'n8n-nodes-base.code';
  n.typeVersion = 2;
  n.parameters = { jsCode };
  for (const k of ['credentials', 'webhookId', 'retryOnFail', 'maxTries', 'waitBetweenTries']) delete n[k];
}

/** Keep a real HTTP Request node but send it to the mock server without credentials. */
function toMock(wf, name) {
  const n = nodeOf(wf, name);
  if (n.type !== 'n8n-nodes-base.httpRequest') throw new Error(`${name} is not an HTTP Request node`);
  n.parameters.url = n.parameters.url.replace('https://graph.facebook.com', MOCK);
  n.parameters.authentication = 'none';
  delete n.parameters.genericAuthType;
  delete n.parameters.nodeCredentialType;
  delete n.credentials;
  n.retryOnFail = false;
}

/** Replace trigger `name` by a Manual Trigger (+ fixture items). Other triggers are removed. */
function startFrom(wf, name, items) {
  for (const t of wf.nodes.filter((n) => /trigger$/i.test(n.type) && n.name !== name)) {
    wf.nodes = wf.nodes.filter((n) => n !== t);
    delete wf.connections[t.name];
  }
  const t = nodeOf(wf, name);
  t.type = 'n8n-nodes-base.manualTrigger';
  t.typeVersion = 1;
  t.parameters = {};
  delete t.credentials;
  delete t.webhookId;
  if (items) {
    wf.nodes.push({ id: '00000000-0000-4000-8000-00000000f1f1', name: '__fixture', type: 'n8n-nodes-base.code', typeVersion: 2, position: [t.position[0], t.position[1] + 200], parameters: { jsCode: returnItems(items) } });
    wf.connections.__fixture = wf.connections[name];
    wf.connections[name] = { main: [[{ node: '__fixture', type: 'main', index: 0 }]] };
  }
}

/** A node still holding a credential would make n8n refuse to start: make it fail loudly if reached. */
function guardUnstubbed(wf) {
  for (const n of wf.nodes) if (n.credentials) toCode(wf, n.name, `throw new Error('UNSTUBBED NODE REACHED: ${n.name}');`);
}

const passThrough = 'return $input.all();';

// ---------- n8n runner ----------
function n8n(args, home) {
  return new Promise((resolve) => {
    execFile(N8N_BIN, args, {
      env: { ...process.env, N8N_USER_FOLDER: home, N8N_DIAGNOSTICS_ENABLED: 'false', N8N_ENCRYPTION_KEY: 'runtime-test-only', N8N_LOG_LEVEL: 'error', N8N_RUNNERS_ENABLED: 'true' },
      timeout: 300000,
      maxBuffer: 64 * 1024 * 1024,
    }, (error, stdout, stderr) => resolve({ error, stdout, stderr }));
  });
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
        const nodes = {};
        for (const [name, runs] of Object.entries(data.resultData.runData || {})) {
          const outputs = [];
          for (const run of runs) {
            (run.data && run.data.main ? run.data.main : []).forEach((o, i) => {
              outputs[i] = (outputs[i] || []).concat((o || []).map((item) => item.json));
            });
          }
          nodes[name] = { error: runs.map((r) => r.error && r.error.message).find(Boolean) || null, outputs, runs: runs.length };
        }
        resolve({ status: rows[0].status, error: data.resultData.error ? data.resultData.error.message : null, nodes });
      },
    );
  });
}

// ---------- scenarios ----------
const scenarios = [];
const scenario = (name, file, setup, check, routes = []) => scenarios.push({ name, file, setup, check, routes });
const out = (r, node, output = 0) => (r.nodes[node] ? r.nodes[node].outputs[output] || [] : null);
const ran = (r, node) => Boolean(r.nodes[node]);
function expect(cond, message) {
  if (!cond) throw new Error(message);
}
const requests = (pathPart) => mockLog.filter((m) => m.path.includes(pathPart));

// ===== Workflow 1 – content generator =====
scenario('1a generator: fake LLM writes 6 drafts needing approval', '01-content-generator.json', (wf) => {
  startFrom(wf, 'Every Friday 10:00');
  toCode(wf, 'Read config', returnItems(config()));
  toMock(wf, 'Fetch brand rules');
  toMock(wf, 'Fetch content brief');
  toCode(wf, 'Read posts', returnItems([{}]));
  toCode(wf, 'Save drafts (needs approval)', passThrough);
}, (r) => {
  expect(r.status === 'success', `status ${r.status}: ${r.error}`);
  expect(out(r, 'Fetch brand rules')[0].error, 'placeholder URL fails but the node continues');
  const saved = out(r, 'Save drafts (needs approval)');
  expect(saved && saved.length === 6, `expected 6 saved rows, got ${saved && saved.length}`);
  expect(saved.every((row) => row.status === 'needs approval'), 'all rows need approval');
  expect(new Set(saved.map((row) => row.pitch)).size === 3, 'all three pitches used');
  expect(saved.filter((row) => row.language === 'zh').length === 3, '3 Chinese drafts');
  expect(saved.every((row) => row.text.includes(`wa.me/${WA}?text=`)), 'CTA with tracking code');
  expect(!ran(r, 'Call LLM'), 'real LLM not called in fake mode');
});

scenario('1b generator: refuses to write a second set for the same week', '01-content-generator.json', (wf) => {
  startFrom(wf, 'Every Friday 10:00');
  toCode(wf, 'Read config', returnItems(config({ WEEK_OFFSET: '0' })));
  toMock(wf, 'Fetch brand rules');
  toMock(wf, 'Fetch content brief');
  toCode(wf, 'Read posts', returnItems([{ post_id: 'x', week: weekId(isoWeekOf(now)) }]));
  toCode(wf, 'Save drafts (needs approval)', passThrough);
}, (r) => {
  expect(r.status === 'error', 'should fail');
  expect(/already exist/.test(r.nodes['Plan week'].error || ''), `Plan week error: ${r.nodes['Plan week'] && r.nodes['Plan week'].error}`);
  expect(!ran(r, 'Save drafts (needs approval)'), 'nothing saved');
});

scenario('1c generator: real LLM call (mock) is parsed and banned claims are flagged', '01-content-generator.json', (wf) => {
  startFrom(wf, 'Every Friday 10:00');
  toCode(wf, 'Read config', returnItems(config({ USE_FAKE_LLM: 'FALSE', LLM_MODEL: 'test-model', LLM_BASE_URL: `${MOCK}/v1`, BRAND_RULES_URL: `${MOCK}/files/brand-rules.md`, CONTENT_BRIEF_URL: `${MOCK}/files/content-brief.md`, POST_DAYS: 'Mon', LANGUAGES: 'en,zh' })));
  for (const n of ['Fetch brand rules', 'Fetch content brief', 'Call LLM']) toMock(wf, n);
  toCode(wf, 'Read posts', returnItems([{}]));
  toCode(wf, 'Save drafts (needs approval)', passThrough);
}, (r) => {
  expect(r.status === 'success', `status ${r.status}: ${r.error}`);
  const call = requests('/v1/chat/completions')[0];
  expect(call && call.body.model === 'test-model', 'LLM called with the configured model');
  expect(call.body.response_format && call.body.response_format.type === 'json_object', 'JSON mode requested');
  expect(call.body.messages[0].content.includes('MOCK BRAND RULES'), 'brand rules are in the system prompt');
  expect(call.body.messages[0].content.includes('MOCK BRIEF'), 'brief is in the system prompt');
  const saved = out(r, 'Save drafts (needs approval)');
  expect(saved.length === 2, `2 rows, got ${saved.length}`);
  expect(/BLOCK B1/.test(saved.find((x) => x.language === 'en').compliance_flags), 'fraud flagged');
  expect(saved.every((x) => x.status === 'needs approval'), 'still only a draft');
  expect(!ran(r, 'Fake LLM (test)'), 'fake LLM not used');
}, [
  { method: 'GET', path: /brand-rules\.md$/, reply: { text: '# MOCK BRAND RULES' } },
  { method: 'GET', path: /content-brief\.md$/, reply: { text: '# MOCK BRIEF' } },
  { method: 'POST', path: /\/v1\/chat\/completions$/, reply: { body: chatResponse({ posts: [{ slot: 1, image_idea: 'demo screenshot', en: { body: 'Catch supplier fraud fast!', hashtags: ['#RetailMY'] }, zh: { body: '老板，你的货压了多少？', hashtags: ['#大马零售'] } }] }) } },
]);

// ===== Workflow 2 – publisher =====
const cta = `WhatsApp us: https://wa.me/${WA}?text=STOCK`;
const postRow = (over) => ({ post_id: 'P-1', week: '2026-W45', status: 'approved', scheduled_for: hoursAgo(1), channels: 'facebook', text: `Some of your cash sits on the shelf (demo data).\n\n${cta}`, image_url: '', ...over });

function publisherBase(wf, rows, cfg) {
  startFrom(wf, 'Every hour 07:00–23:00');
  toCode(wf, 'Read config', returnItems(config(cfg)));
  toCode(wf, 'Read posts', returnItems(rows));
  toCode(wf, 'Mark publishing', passThrough);
  toCode(wf, 'Update post row', passThrough);
  for (const n of ['Post Facebook photo', 'Post Facebook text', 'Create IG container', 'Publish IG container']) toMock(wf, n);
  toCode(wf, 'Wait for Instagram', passThrough);
}
const updates = (r) => out(r, 'Update post row') || [];

scenario('2a publisher (dry run): posts the due approved row, blocks fraud, asks for an image', '02-publisher.json', (wf) => {
  publisherBase(wf, [
    postRow({ post_id: 'P-ok' }),
    postRow({ post_id: 'P-fraud', text: `Stop supplier fraud!\n\n${cta}` }),
    postRow({ post_id: 'P-ig', channels: 'facebook,instagram' }),
    postRow({ post_id: 'P-later', scheduled_for: formatMyt(new Date(now.getTime() + 86400000)) }),
    postRow({ post_id: 'P-draft', status: 'needs approval' }),
  ], { DRY_RUN: 'TRUE' });
}, (r) => {
  expect(r.status === 'success', `status ${r.status}: ${r.error}`);
  const u = updates(r);
  const byId = Object.fromEntries(u.map((x) => [x.post_id, x]));
  expect(byId['P-ok'] && byId['P-ok'].status === 'posted (dry run)', `P-ok: ${json(byId['P-ok'])}`);
  expect(byId['P-fraud'] && byId['P-fraud'].status === 'blocked', 'fraud blocked');
  expect(byId['P-ig'] && byId['P-ig'].status === 'needs image', 'instagram needs image');
  expect(!byId['P-later'] && !byId['P-draft'], 'future and unapproved rows untouched');
  expect(out(r, 'Mark publishing').length === 1, 'marked publishing first');
  expect(requests('/feed').length === 0 && requests('/photos').length === 0, 'nothing sent to Meta in dry run');
});

scenario('2b publisher (live, mock Meta): Facebook photo + Instagram, IDs logged', '02-publisher.json', (wf) => {
  publisherBase(wf, [postRow({ post_id: 'P-live', channels: 'facebook,instagram', image_url: 'https://img.example.com/demo.jpg' })], { DRY_RUN: 'FALSE', FB_PAGE_ID: 'PAGE123', IG_USER_ID: 'IG456' });
}, (r) => {
  expect(r.status === 'success', `status ${r.status}: ${r.error}`);
  const photo = requests('/v25.0/PAGE123/photos')[0];
  expect(photo && photo.body.url === 'https://img.example.com/demo.jpg' && photo.body.message.includes('wa.me'), `photo request ${json(photo)}`);
  const media = requests('/v25.0/IG456/media')[0];
  expect(media && media.body.image_url && media.body.caption.includes('wa.me'), 'IG container request');
  expect(requests('/IG456/media_publish')[0].body.creation_id === 'CONTAINER1', 'publish uses the container id');
  const u = updates(r)[0];
  expect(u.status === 'posted' && u.fb_post_id === 'PAGE123_999' && u.ig_media_id === 'IGMEDIA1', `update ${json(u)}`);
  expect(!ran(r, 'Post Facebook text'), 'photo post, not text post');
}, [
  { method: 'POST', path: /\/PAGE123\/photos$/, reply: { body: { id: '999', post_id: 'PAGE123_999' } } },
  { method: 'POST', path: /\/IG456\/media$/, reply: { body: { id: 'CONTAINER1' } } },
  { method: 'POST', path: /\/IG456\/media_publish$/, reply: { body: { id: 'IGMEDIA1' } } },
]);

scenario('2c publisher (live, mock Meta): Instagram error → "error", Facebook ID kept, no retry', '02-publisher.json', (wf) => {
  publisherBase(wf, [postRow({ post_id: 'P-half', channels: 'facebook,instagram', image_url: 'https://img.example.com/demo.jpg' })], { DRY_RUN: 'FALSE', FB_PAGE_ID: 'PAGE123', IG_USER_ID: 'IG456' });
}, (r) => {
  expect(r.status === 'success', `status ${r.status}: ${r.error}`);
  const u = updates(r)[0];
  expect(u.status === 'error' && u.fb_post_id === 'PAGE123_1' && /Partly posted/.test(u.error) && /Instagram/.test(u.error), `update ${json(u)}`);
}, [
  { method: 'POST', path: /\/PAGE123\/photos$/, reply: { body: { id: '1', post_id: 'PAGE123_1' } } },
  { method: 'POST', path: /\/IG456\/media$/, reply: { status: 400, body: { error: { message: 'Only photo or video can be accepted as media type.', code: 9004 } } } },
  { method: 'POST', path: /\/IG456\/media_publish$/, reply: { status: 400, body: { error: { message: 'The parameter creation_id is required.' } } } },
]);

scenario('2d publisher (live): text-only Facebook post; config placeholders stop a live run', '02-publisher.json', (wf) => {
  publisherBase(wf, [postRow({ post_id: 'P-text' })], { DRY_RUN: 'FALSE', FB_PAGE_ID: 'PAGE123' });
}, (r) => {
  expect(r.status === 'success', `status ${r.status}: ${r.error}`);
  expect(requests('/PAGE123/feed')[0].body.message.startsWith('Some of your cash'), 'feed post text');
  expect(updates(r)[0].fb_post_id === 'PAGE123_42', 'feed id logged');
}, [{ method: 'POST', path: /\/PAGE123\/feed$/, reply: { body: { id: 'PAGE123_42' } } }]);

scenario('2e publisher (live): missing FB_PAGE_ID in config stops before posting', '02-publisher.json', (wf) => {
  publisherBase(wf, [postRow({ post_id: 'P-cfg' })], { DRY_RUN: 'FALSE' });
}, (r) => {
  expect(r.status === 'error' && /FB_PAGE_ID/.test(r.nodes['Pick next post'].error || ''), `error: ${r.error}`);
  expect(!ran(r, 'Mark publishing'), 'nothing marked or posted');
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
  const imported = await n8n(['import:workflow', '--separate', `--input=${work}`], home);
  if (imported.error) throw new Error(`import failed: ${imported.stderr.slice(-800)}`);
  for (const s of selected) {
    mockRoutes = s.routes;
    mockLog.length = 0;
    // n8n's CLI often reports "No active execution found" for fast runs; the result is read from the database.
    await n8n(['execute', `--id=${s.id}`, '--rawOutput'], home);
    try {
      s.check(await lastExecution(home, s.id));
      console.log(`PASS ${s.name}`);
    } catch (e) {
      failed += 1;
      console.log(`FAIL ${s.name}\n     ${e.message}`);
    }
  }
} finally {
  rmSync(work, { recursive: true, force: true });
  server.close();
}
console.log(`${selected.length - failed}/${selected.length} runtime scenarios passed`);
process.exit(failed ? 1 : 0);
