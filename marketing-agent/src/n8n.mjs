// Small helpers that produce n8n workflow JSON (the format n8n exports and imports).
// Node type versions are chosen to exist in both n8n 1.121 and n8n 2.46 (checked by validate.mjs).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const V = {
  schedule: 1.2,
  sheets: 4.7,
  http: 4.2,
  code: 2,
  if: 2.2,
  set: 3.4,
  noOp: 1,
  sticky: 1,
  wait: 1.1,
  whatsApp: 1.1,
  whatsAppTrigger: 1,
  facebookTrigger: 1,
  telegram: 1.2,
  email: 2.1,
};

/** Placeholder credential references. n8n asks you to pick a real credential after import. */
export const CRED = {
  sheets: { googleSheetsOAuth2Api: { id: 'PLACEHOLDER_GOOGLE_SHEETS', name: 'PLACEHOLDER Google Sheets account' } },
  llm: { httpHeaderAuth: { id: 'PLACEHOLDER_LLM_API_KEY', name: 'PLACEHOLDER LLM API key' } },
  meta: { facebookGraphApi: { id: 'PLACEHOLDER_META_PAGE_TOKEN', name: 'PLACEHOLDER Meta Page access token' } },
  metaApp: { facebookGraphAppApi: { id: 'PLACEHOLDER_META_APP', name: 'PLACEHOLDER Meta app (Messenger webhook)' } },
  whatsApp: { whatsAppApi: { id: 'PLACEHOLDER_WHATSAPP_CLOUD_API', name: 'PLACEHOLDER WhatsApp Cloud API' } },
  whatsAppTrigger: { whatsAppTriggerApi: { id: 'PLACEHOLDER_WHATSAPP_TRIGGER', name: 'PLACEHOLDER WhatsApp trigger (Meta app)' } },
  telegram: { telegramApi: { id: 'PLACEHOLDER_TELEGRAM_BOT', name: 'PLACEHOLDER Telegram bot' } },
  smtp: { smtp: { id: 'PLACEHOLDER_SMTP', name: 'PLACEHOLDER SMTP email account' } },
};

const LIB_DIR = new URL('./lib/', import.meta.url);
const LIB_ORDER = ['config', 'dates', 'compliance', 'pitches', 'llm', 'posts', 'leads', 'replies', 'report'];
const LIB_DEPS = {
  config: [], dates: [], compliance: [], pitches: [], llm: [],
  posts: ['dates', 'pitches', 'compliance', 'config'],
  leads: ['dates', 'pitches', 'compliance'],
  replies: ['dates', 'compliance', 'leads'],
  report: ['dates', 'pitches'],
};

function withDeps(names) {
  const set = new Set();
  const add = (n) => {
    if (set.has(n)) return;
    for (const d of LIB_DEPS[n]) add(d);
    set.add(n);
  };
  names.forEach(add);
  return LIB_ORDER.filter((n) => set.has(n));
}

function libSource(name) {
  const src = readFileSync(new URL(`${name}.cjs`, LIB_DIR), 'utf8');
  return src
    .replace(/\/\* @import-start \*\/[\s\S]*?\/\* @import-end \*\/\n?/g, '')
    .replace(/\/\* @export-start \*\/[\s\S]*?\/\* @export-end \*\/\n?/g, '')
    .trim();
}

/** Code node JavaScript: the shared library files it needs, then the node's own code. */
export function codeWithLibs(libs, body) {
  const parts = withDeps(libs).map((n) => `// ===== lib/${n}.cjs (generated, edit marketing-agent/src/lib/${n}.cjs) =====\n${libSource(n)}`);
  return [...parts, '// ===== node code =====', body.trim()].join('\n\n') + '\n';
}

function stableUuid(seed) {
  const h = createHash('sha256').update(seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${((parseInt(h[16], 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export function workflow(slug, name, settings = {}) {
  const nodes = [];
  const connections = {};
  const api = {
    add(nodeName, type, typeVersion, position, parameters, extra = {}) {
      if (nodes.some((n) => n.name === nodeName)) throw new Error(`Duplicate node name ${nodeName}`);
      nodes.push({ parameters, id: stableUuid(`${slug}/${nodeName}`), name: nodeName, type, typeVersion, position, ...extra });
      return nodeName;
    },
    link(from, to, output = 0) {
      connections[from] = connections[from] || { main: [] };
      while (connections[from].main.length <= output) connections[from].main.push([]);
      connections[from].main[output].push({ node: to, type: 'main', index: 0 });
    },
    chain(...names) {
      for (let i = 0; i < names.length - 1; i++) api.link(names[i], names[i + 1]);
    },
    toJSON() {
      return {
        name,
        nodes,
        connections,
        pinData: {},
        active: false,
        settings: {
          executionOrder: 'v1',
          timezone: 'Asia/Kuala_Lumpur',
          saveManualExecutions: true,
          saveDataErrorExecution: 'all',
          saveDataSuccessExecution: 'all',
          callerPolicy: 'workflowsFromSameOwner',
          ...settings,
        },
        meta: { templateCredsSetupCompleted: false },
      };
    },
  };
  return api;
}

// ---------- common node shapes ----------

export const SHEET_ID_EXPR = "={{ $('Settings').first().json.SHEET_ID }}";
export const CFG = (key) => `$('Load config').first().json.${key}`;

export function settingsNode(w, position) {
  return w.add('Settings', 'n8n-nodes-base.set', V.set, position, {
    mode: 'manual',
    assignments: {
      assignments: [{ id: stableUuid('settings/SHEET_ID'), name: 'SHEET_ID', value: 'PLACEHOLDER_GOOGLE_SHEET_ID', type: 'string' }],
    },
    includeOtherFields: false,
    options: {},
  }, { notes: 'Paste your Google Sheet ID here (the long part of the sheet URL between /d/ and /edit). All other settings are in the sheet\'s "config" tab.', notesInFlow: true });
}

export function readSheetNode(w, name, tab, position) {
  return w.add(name, 'n8n-nodes-base.googleSheets', V.sheets, position, {
    authentication: 'oAuth2',
    resource: 'sheet',
    operation: 'read',
    documentId: { __rl: true, value: SHEET_ID_EXPR, mode: 'id' },
    sheetName: { __rl: true, value: tab, mode: 'name' },
    filtersUI: {},
    options: {},
  }, { credentials: CRED.sheets, executeOnce: true, alwaysOutputData: true });
}

export function writeSheetNode(w, name, tab, operation, matchColumn, position) {
  return w.add(name, 'n8n-nodes-base.googleSheets', V.sheets, position, {
    authentication: 'oAuth2',
    resource: 'sheet',
    operation,
    documentId: { __rl: true, value: SHEET_ID_EXPR, mode: 'id' },
    sheetName: { __rl: true, value: tab, mode: 'name' },
    columns: {
      mappingMode: 'autoMapInputData',
      value: {},
      matchingColumns: matchColumn ? [matchColumn] : [],
      schema: [],
      attemptToConvertTypes: false,
      convertFieldsToString: false,
    },
    options: { cellFormat: 'RAW', handlingExtraData: 'ignoreIt' },
  }, { credentials: CRED.sheets });
}

/** Update only the given columns (defineBelow), matching on `matchColumn`. */
export function setStatusNode(w, name, tab, matchColumn, status, position) {
  const col = (id) => ({ id, displayName: id, required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true });
  return w.add(name, 'n8n-nodes-base.googleSheets', V.sheets, position, {
    authentication: 'oAuth2',
    resource: 'sheet',
    operation: 'update',
    documentId: { __rl: true, value: SHEET_ID_EXPR, mode: 'id' },
    sheetName: { __rl: true, value: tab, mode: 'name' },
    columns: {
      mappingMode: 'defineBelow',
      value: { [matchColumn]: `={{ $json.${matchColumn} }}`, status },
      matchingColumns: [matchColumn],
      schema: [col(matchColumn), col('status')],
      attemptToConvertTypes: false,
      convertFieldsToString: false,
    },
    options: { cellFormat: 'RAW' },
  }, { credentials: CRED.sheets });
}

export function codeNode(w, name, position, libs, body, { perItem = false, ...extra } = {}) {
  const parameters = perItem ? { mode: 'runOnceForEachItem', jsCode: codeWithLibs(libs, body) } : { jsCode: codeWithLibs(libs, body) };
  return w.add(name, 'n8n-nodes-base.code', V.code, position, parameters, extra);
}

export function loadConfigNode(w, position) {
  return codeNode(w, 'Load config', position, ['config'], `
// Settings from the "config" tab (key | value | notes). Empty cells keep the defaults in lib/config.cjs.
const config = parseConfig($input.all().map((item) => item.json));
return [{ json: config }];
`);
}

export function ifNode(w, name, position, booleanExpression) {
  return w.add(name, 'n8n-nodes-base.if', V.if, position, {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
      conditions: [{ id: stableUuid(`${name}/condition`), leftValue: `={{ ${booleanExpression} }}`, rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }],
      combinator: 'and',
    },
    options: {},
  });
}

export function fetchTextNode(w, name, urlKey, position) {
  return w.add(name, 'n8n-nodes-base.httpRequest', V.http, position, {
    url: `={{ ${CFG(urlKey)} }}`,
    options: { response: { response: { responseFormat: 'text', outputPropertyName: 'data' } }, timeout: 30000 },
  }, { executeOnce: true, onError: 'continueRegularOutput', notes: `Downloads the file at ${urlKey} (config tab). If it fails, the next node decides what to do.`, notesInFlow: true });
}

export function llmNode(w, name, position, extra = {}) {
  return w.add(name, 'n8n-nodes-base.httpRequest', V.http, position, {
    method: 'POST',
    url: `={{ ${CFG('LLM_BASE_URL')} }}/chat/completions`,
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    sendBody: true,
    specifyBody: 'json',
    jsonBody: '={{ JSON.stringify($json.llm_request) }}',
    options: { timeout: 120000 },
  }, {
    credentials: CRED.llm,
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    notes: 'OpenAI-compatible POST {LLM_BASE_URL}/chat/completions. Credential: Header Auth, name "Authorization", value "Bearer <your key>".',
    notesInFlow: true,
    ...extra,
  });
}

export function graphPostNode(w, name, position, pathExpression, bodyExpression, extra = {}) {
  return w.add(name, 'n8n-nodes-base.httpRequest', V.http, position, {
    method: 'POST',
    url: `=https://graph.facebook.com/{{ ${CFG('GRAPH_API_VERSION')} }}/${pathExpression}`,
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'facebookGraphApi',
    sendBody: true,
    specifyBody: 'json',
    jsonBody: `={{ JSON.stringify(${bodyExpression}) }}`,
    options: { timeout: 60000 },
  }, { credentials: CRED.meta, onError: 'continueRegularOutput', ...extra });
}

export function sticky(w, name, position, content, { width = 420, height = 300, color = 7 } = {}) {
  return w.add(name, 'n8n-nodes-base.stickyNote', V.sticky, position, { content, height, width, color });
}

export function scheduleCron(w, name, position, cron) {
  return w.add(name, 'n8n-nodes-base.scheduleTrigger', V.schedule, position, {
    rule: { interval: [{ field: 'cronExpression', expression: cron }] },
  });
}
