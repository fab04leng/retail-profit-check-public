// Workflow 3 – Lead inbox.
// Incoming WhatsApp Business (Cloud API) and Facebook Page (Messenger) messages from people who
// contacted US → intent (question / wants_demo / not_interested) → a draft reply for approval
// → the "leads" tab, with source and pitch variant. Nothing is sent from this workflow.
// Sending approved replies is workflow 3b, which only replies inside the 24-hour window.
import {
  workflow, settingsNode, readSheetNode, writeSheetNode, loadConfigNode, codeNode, ifNode, fetchTextNode, llmNode, sticky, CFG, CRED, V,
} from '../n8n.mjs';

export default function build() {
  // Successful runs are not stored in n8n's execution log: message texts and numbers stay only in the sheet (PDPA).
  const w = workflow('03-lead-inbox', 'RPC 3 – Lead inbox (inbound WhatsApp & Messenger → draft replies)', { saveDataSuccessExecution: 'none' });

  sticky(w, 'About this workflow', [-160, -500], [
    '## 3. Lead inbox (inbound only)',
    'Starts **only when someone messages us** on WhatsApp Business or our Facebook Page.',
    '',
    '1. Reads the message, finds the pitch code (STOCK / PROFIT / INVOICE) and the language.',
    '2. Classifies intent: **question / wants_demo / not_interested** and drafts a reply.',
    '3. Saves or updates the lead in the **leads** tab with status **needs approval**.',
    '',
    '**Nothing is sent here.** Approve a reply by setting `status` to `approved`; workflow 3b sends it (only within 24 h of their last message).',
    '"STOP" / opt-outs are detected without the LLM and marked `do_not_contact = yes`.',
    '**No cold outreach, no bulk messages** (PDPA, WhatsApp Business policy).',
  ].join('\n'), { width: 560, height: 360, color: 4 });
  sticky(w, 'Webhook setup', [-160, 420], [
    '### Webhooks (see SETUP.md)',
    '- **WhatsApp Trigger**: credential = Meta app Client ID + Client Secret. Activating the workflow registers the webhook with Meta.',
    '- **Messenger Trigger**: Facebook App credential (App access token + App Secret) and your **App ID** in the node. Then subscribe your Page to the app (SETUP.md step 7).',
    'Only one WhatsApp webhook URL per Meta app.',
  ].join('\n'), { width: 520, height: 220, color: 6 });

  w.add('WhatsApp Trigger', 'n8n-nodes-base.whatsAppTrigger', V.whatsAppTrigger, [0, 0], {
    updates: ['messages'],
    options: { messageStatusUpdates: [] },
  }, { credentials: CRED.whatsAppTrigger, webhookId: '3a8f1d2c-7b4e-4c9a-8e21-5f0b6d7c8a91' });
  w.add('Messenger Trigger', 'n8n-nodes-base.facebookTrigger', V.facebookTrigger, [0, 240], {
    appId: 'PLACEHOLDER_META_APP_ID',
    object: 'page',
    fields: ['messages', 'messaging_postbacks', 'messaging_referrals'],
    options: {},
  }, {
    credentials: CRED.metaApp,
    webhookId: '9c2e4a6b-1d3f-4b5a-8c7d-0e9f1a2b3c4d',
    notes: 'Fields messages / messaging_postbacks / messaging_referrals are set on purpose. The editor\'s list may not show them; they are sent to Meta as they are.',
    notesInFlow: true,
  });

  codeNode(w, 'Normalise WhatsApp', [220, 0], ['leads'], `
// One item per inbound message. Status updates and non-message events are dropped.
return normaliseWhatsApp($input.all().map((item) => item.json)).map((m) => ({ json: m }));
`);
  codeNode(w, 'Normalise Messenger', [220, 240], ['leads'], `
// One item per inbound message. Our own Page's echoes, read and delivery receipts are dropped.
return normaliseMessenger($input.all().map((item) => item.json)).map((m) => ({ json: m }));
`);
  w.add('Inbound messages', 'n8n-nodes-base.noOp', V.noOp, [440, 120], {});
  settingsNode(w, [660, 120]);
  readSheetNode(w, 'Read config', 'config', [880, 120]);
  loadConfigNode(w, [1100, 120]);
  fetchTextNode(w, 'Fetch brand rules', 'BRAND_RULES_URL', [1320, 120]);
  readSheetNode(w, 'Read leads', 'leads', [1540, 120]);

  codeNode(w, 'Prepare leads', [1760, 120], ['leads', 'llm', 'config'], `
// Group messages per contact, match the existing lead row, drop duplicate deliveries,
// detect opt-outs, language and pitch, and build the LLM request where one is needed.
const config = $('Load config').first().json;
const messages = $('Inbound messages').all().map((item) => item.json);
const existing = $input.all().map((item) => item.json);
const brand = $('Fetch brand rules').first().json || {};
const brandRules = !brand.error && typeof brand.data === 'string' ? brand.data : '';
const prepared = prepareLeads(messages, existing, config);
if (!config.USE_FAKE_LLM && prepared.some((lead) => lead.mode === 'llm')) {
  requireConfigured(config, ['LLM_MODEL'], 'needed to classify messages');
}
return prepared.map((lead) => {
  const out = Object.assign({}, lead, { brand_rules_loaded: Boolean(brandRules) });
  if (lead.mode === 'llm') {
    const m = buildClassifyMessages(lead, brandRules);
    out.llm_request = buildChatRequest({ model: config.LLM_MODEL, temperature: 0.3, jsonMode: config.LLM_JSON_MODE, system: m.system, user: m.user });
  }
  return { json: out, pairedItem: { item: 0 } };
});
`);
  ifNode(w, 'Needs LLM?', [1980, 120], "$json.mode === 'llm'");
  ifNode(w, 'Use fake LLM?', [2200, 0], CFG('USE_FAKE_LLM'));
  codeNode(w, 'Fake classify (test)', [2420, -100], ['leads', 'llm'], `
// Keyword classifier in the same shape as a chat-completions response. Tagged [FAKE LLM TEST].
return { json: fakeChatResponse(fakeClassify($json)) };
`, { perItem: true });
  llmNode(w, 'Classify with LLM', [2420, 100], { onError: 'continueRegularOutput' });

  codeNode(w, 'Build lead row', [2640, 120], ['leads', 'llm'], `
// The row for the leads tab. If the LLM failed, the lead is still saved without a draft.
const config = $('Load config').first().json;
const lead = $('Prepare leads').item.json;
let classification = null;
let llmError = '';
if (lead.mode === 'llm') {
  try {
    classification = parseJsonLoose(extractContent($json));
  } catch (e) {
    llmError = String((e && e.message) || e);
  }
}
const row = finaliseLead(lead, classification, config, new Date());
const extra = [];
if (llmError) {
  row.draft_reply = '';
  extra.push('CHECK: the LLM failed (' + llmError.slice(0, 150) + '). Write the reply yourself.');
}
if (lead.mode === 'llm' && !config.USE_FAKE_LLM && !lead.brand_rules_loaded) {
  extra.push('CHECK: brand rules could not be downloaded; read the draft carefully.');
}
if (extra.length) row.compliance_flags = extra.concat(row.compliance_flags ? [row.compliance_flags] : []).join(' | ');
return { json: row };
`, { perItem: true });
  writeSheetNode(w, 'Save lead (needs approval)', 'leads', 'appendOrUpdate', 'lead_id', [2860, 120]);

  w.link('WhatsApp Trigger', 'Normalise WhatsApp');
  w.link('Messenger Trigger', 'Normalise Messenger');
  w.link('Normalise WhatsApp', 'Inbound messages');
  w.link('Normalise Messenger', 'Inbound messages');
  w.chain('Inbound messages', 'Settings', 'Read config', 'Load config', 'Fetch brand rules', 'Read leads', 'Prepare leads', 'Needs LLM?');
  w.link('Needs LLM?', 'Use fake LLM?', 0);
  w.link('Needs LLM?', 'Build lead row', 1);
  w.link('Use fake LLM?', 'Fake classify (test)', 0);
  w.link('Use fake LLM?', 'Classify with LLM', 1);
  w.link('Fake classify (test)', 'Build lead row');
  w.link('Classify with LLM', 'Build lead row');
  w.link('Build lead row', 'Save lead (needs approval)');
  return w;
}
