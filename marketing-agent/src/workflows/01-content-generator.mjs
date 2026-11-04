// Workflow 1 – Content generator.
// Every Friday 10:00 (Malaysia time) it plans next week's posts (one pitch per posting day,
// rotated weekly), asks the LLM for EN + casual Malaysian Chinese drafts, checks them against
// the brand rules and appends them to the "posts" tab with status "needs approval".
// Nothing is published here.
import {
  workflow, settingsNode, readSheetNode, writeSheetNode, loadConfigNode, codeNode, ifNode, fetchTextNode, llmNode, sticky, scheduleCron, CFG,
} from '../n8n.mjs';

export default function build() {
  const w = workflow('01-content-generator', 'RPC 1 – Content generator (drafts for approval)');

  sticky(w, 'About this workflow', [-120, -420], [
    '## 1. Content generator',
    'Runs **every Friday 10:00** (Malaysia time) and writes **next week\'s** drafts to the **posts** tab with status **needs approval**.',
    '',
    '- One post per day in `POST_DAYS` × each language in `LANGUAGES` (default 3 × EN + 中文 = 6 drafts).',
    '- Pitches rotate weekly: profit by product / cash stuck in stock / supplier invoice mistakes.',
    '- The call to action and WhatsApp link are added by code, with the pitch code for tracking.',
    '- **Nothing is published here.** Change a row\'s status to `approved` to let workflow 2 post it.',
    '',
    'Test: set `USE_FAKE_LLM` = TRUE in the config tab and click **Test workflow**.',
  ].join('\n'), { width: 520, height: 300, color: 4 });

  scheduleCron(w, 'Every Friday 10:00', [0, 0], '0 10 * * 5');
  settingsNode(w, [220, 0]);
  readSheetNode(w, 'Read config', 'config', [440, 0]);
  loadConfigNode(w, [660, 0]);
  fetchTextNode(w, 'Fetch brand rules', 'BRAND_RULES_URL', [880, 0]);
  fetchTextNode(w, 'Fetch content brief', 'CONTENT_BRIEF_URL', [1100, 0]);
  readSheetNode(w, 'Read posts', 'posts', [1320, 0]);

  codeNode(w, 'Plan week', [1540, 0], ['posts', 'llm'], `
// Decide this run's slots (day, pitch, time) and build the LLM request.
const config = $('Load config').first().json;
const now = new Date();
const downloaded = (nodeName) => {
  const json = $(nodeName).first().json || {};
  return !json.error && typeof json.data === 'string' && json.data.trim() ? json.data : '';
};
const brandRules = downloaded('Fetch brand rules');
const brief = downloaded('Fetch content brief');
if (!config.USE_FAKE_LLM) {
  requireConfigured(config, ['LLM_MODEL', 'BRAND_RULES_URL', 'CONTENT_BRIEF_URL'], 'needed to call the LLM');
  if (!brandRules) throw new Error('Could not download brand-rules.md from BRAND_RULES_URL. Open that link in a private browser window: it must show the plain text.');
  if (!brief) throw new Error('Could not download content-brief.md from CONTENT_BRIEF_URL. Open that link in a private browser window: it must show the plain text.');
}
const plan = buildSlots(config, now);
const existing = $input.all().map((item) => item.json).filter((row) => row.post_id && String(row.week) === plan.week);
if (existing.length) {
  throw new Error(\`Drafts for \${plan.week} already exist (\${existing.length} rows in the posts tab). Delete them first if you want new drafts for that week.\`);
}
const languages = languagesFrom(config);
const messages = buildContentMessages({ brandRules, brief, slots: plan.slots, languages, week: plan.week });
const llm_request = buildChatRequest({
  model: config.LLM_MODEL,
  temperature: config.LLM_TEMPERATURE,
  jsonMode: config.LLM_JSON_MODE,
  system: messages.system,
  user: messages.user,
});
return [{ json: { plan, languages, llm_request, brand_rules_loaded: Boolean(brandRules), brief_loaded: Boolean(brief) } }];
`);

  ifNode(w, 'Use fake LLM?', [1760, 0], CFG('USE_FAKE_LLM'));
  codeNode(w, 'Fake LLM (test)', [1980, -120], ['posts', 'llm'], `
// Canned drafts in the same shape as a real chat-completions response. Tagged [FAKE LLM TEST].
const { plan, languages } = $('Plan week').first().json;
return [{ json: fakeChatResponse(fakeContent(plan, languages)) }];
`);
  llmNode(w, 'Call LLM', [1980, 120]);

  codeNode(w, 'Build draft rows', [2200, 0], ['posts', 'llm'], `
// Parse the LLM JSON, add the call to action, run the brand-rule check, shape the sheet rows.
const config = $('Load config').first().json;
const { plan } = $('Plan week').first().json;
const parsed = parseJsonLoose(extractContent($input.first().json));
const rows = postsToRows(parsed, plan, config, new Date());
return rows.map((row) => ({ json: row }));
`);
  writeSheetNode(w, 'Save drafts (needs approval)', 'posts', 'append', null, [2420, 0]);

  w.chain('Every Friday 10:00', 'Settings', 'Read config', 'Load config', 'Fetch brand rules', 'Fetch content brief', 'Read posts', 'Plan week', 'Use fake LLM?');
  w.link('Use fake LLM?', 'Fake LLM (test)', 0);
  w.link('Use fake LLM?', 'Call LLM', 1);
  w.link('Fake LLM (test)', 'Build draft rows');
  w.link('Call LLM', 'Build draft rows');
  w.link('Build draft rows', 'Save drafts (needs approval)');
  return w;
}
