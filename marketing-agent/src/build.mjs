// Build: writes the importable n8n workflows, the Google Sheet template and the fake test data.
// Run from the repo root:  node marketing-agent/src/build.mjs
// Do not edit marketing-agent/workflows/*.json by hand: edit src/ and rebuild.
import { mkdirSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { CONFIG_DEFAULTS } = require('./lib/config.cjs');
const { POST_COLUMNS } = require('./lib/posts.cjs');
const { LEAD_COLUMNS } = require('./lib/leads.cjs');

const ROOT = new URL('../', import.meta.url);
const out = (path) => new URL(path, ROOT);

const CONFIG_NOTES = {
  DRY_RUN: 'TRUE = nothing is posted or sent; rows are marked "(dry run)". Set FALSE only when you are ready to go live.',
  USE_FAKE_LLM: 'TRUE = canned test text, no LLM call or API key needed. Set FALSE to use your LLM.',
  LLM_BASE_URL: 'OpenAI-compatible base URL ending in /v1 (OpenAI, OpenRouter, DeepSeek, Groq, local Ollama http://localhost:11434/v1 ...).',
  LLM_MODEL: 'Model name your provider expects, for example the cheapest capable chat model they offer.',
  LLM_JSON_MODE: 'TRUE sends response_format json_object. Set FALSE if your provider rejects it.',
  LLM_TEMPERATURE: '0 = plain and repetitive, 1 = varied. 0.7 is a good start for posts.',
  BRAND_RULES_URL: 'Public raw link to brand-rules.md (for example a secret GitHub Gist "Raw" link).',
  CONTENT_BRIEF_URL: 'Public raw link to content-brief.md.',
  WHATSAPP_NUMBER: 'Your business WhatsApp number, digits only with country code and no leading 0, in the form 601XXXXXXXX. Used in the wa.me link in posts.',
  FB_PAGE_ID: 'Facebook Page ID (Page > About > Page transparency, or Meta Business Suite > Settings).',
  IG_USER_ID: 'Instagram professional account ID linked to the Page (see SETUP.md).',
  WA_PHONE_NUMBER_ID: 'WhatsApp Cloud API "Phone number ID" (Meta app > WhatsApp > API setup). Not the phone number itself.',
  GRAPH_API_VERSION: 'Meta Graph API version, for example v25.0. Check developers.facebook.com/docs/graph-api/changelog.',
  POST_DAYS: 'Posting days, comma separated. One pitch per day, rotated weekly.',
  POST_TIME: 'Posting time (Malaysia time), HH:mm. The publisher runs at the start of every hour from 07:00 to 23:00, so use a full hour (for example 21:00).',
  LANGUAGES: 'en, zh and/or ms. One draft per language per day.',
  DEFAULT_CHANNELS: 'facebook and/or instagram. Change per row in the posts tab if needed.',
  WEEK_OFFSET: '1 = the generator (Friday) writes next week\'s posts. 0 = this week.',
  PRIVACY_NOTICE_URL: 'Optional link to your privacy notice, added to the first reply to a new contact.',
  REPLY_WINDOW_HOURS: 'Replies are only sent within this many hours of their last message (max 24, enforced).',
  MAX_REPLIES_PER_RUN: 'Safety cap on replies sent per 5-minute run (max 10, enforced).',
  REPORT_CHANNEL: 'email, telegram or both.',
  REPORT_EMAIL_TO: 'Where the weekly report goes.',
  REPORT_EMAIL_FROM: 'Sender address allowed by your SMTP account.',
  TELEGRAM_CHAT_ID: 'Your chat ID with your Telegram bot (see SETUP.md).',
};

function csvCell(value) {
  const text = String(value === undefined || value === null ? '' : value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
const csv = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';

function writeJson(path, data) {
  writeFileSync(out(path), JSON.stringify(data, null, 2) + '\n');
}

async function buildWorkflows() {
  mkdirSync(out('workflows'), { recursive: true });
  const defsDir = new URL('./workflows/', import.meta.url);
  const defs = existsSync(defsDir) ? readdirSync(defsDir).filter((f) => f.endsWith('.mjs')).sort() : [];
  for (const file of defs) {
    const mod = await import(new URL(`./workflows/${file}`, import.meta.url));
    const wf = mod.default();
    writeJson(`workflows/${file.replace(/\.mjs$/, '.json')}`, wf.toJSON());
    console.log(`built workflows/${file.replace(/\.mjs$/, '.json')}`);
  }
}

function buildSheetTemplate() {
  mkdirSync(out('sheet-template'), { recursive: true });
  writeFileSync(out('sheet-template/posts.csv'), csv([POST_COLUMNS]));
  writeFileSync(out('sheet-template/leads.csv'), csv([LEAD_COLUMNS]));
  const configRows = [['key', 'value', 'notes']];
  for (const [key, value] of Object.entries(CONFIG_DEFAULTS)) {
    const shown = typeof value === 'boolean' ? (value ? 'TRUE' : 'FALSE') : value;
    configRows.push([key, shown, CONFIG_NOTES[key] || '']);
  }
  writeFileSync(out('sheet-template/config.csv'), csv(configRows));
  console.log('built sheet-template/*.csv');
}

// Fake data for testing. Every name and number here is invented.
const FAKE_WA_NUMBER = '60100000001';
function buildFakeData() {
  mkdirSync(out('fake-data'), { recursive: true });
  const configRows = [['key', 'value', 'notes']];
  const testValues = { ...CONFIG_DEFAULTS, WHATSAPP_NUMBER: FAKE_WA_NUMBER, DRY_RUN: true, USE_FAKE_LLM: true, WEEK_OFFSET: 0 };
  for (const [key, value] of Object.entries(testValues)) {
    configRows.push([key, typeof value === 'boolean' ? (value ? 'TRUE' : 'FALSE') : value, key === 'WHATSAPP_NUMBER' ? 'FAKE test number' : '']);
  }
  writeFileSync(out('fake-data/config-test.csv'), csv(configRows));

  const post = (id, status, scheduled, channels, text, image = '') => {
    const row = Object.fromEntries(POST_COLUMNS.map((c) => [c, '']));
    Object.assign(row, { post_id: id, week: '2026-W45', slot: id.split('-')[2], scheduled_for: scheduled, pitch: 'cash_in_stock', language: id.endsWith('zh') ? 'zh' : 'en', channels, status, text, image_url: image, created_at: '2026-10-30 10:00' });
    return POST_COLUMNS.map((c) => row[c]);
  };
  const cta = `👉 Free 15-min chat, or a 5-min demo on a fictional sample shop. WhatsApp us: https://wa.me/${FAKE_WA_NUMBER}?text=STOCK (or just send "STOCK")`;
  writeFileSync(out('fake-data/posts-test.csv'), csv([
    POST_COLUMNS,
    post('2026-W45-1-en', 'approved', '2026-11-02 20:30', 'facebook', `[TEST] Some of your cash is sitting on the shelf. In our demo shop (fictional data), stock nobody bought in 90 days added up fast.\n\n${cta}`),
    post('2026-W45-2-en', 'approved', '2026-11-04 20:30', 'facebook', `[TEST] Stop supplier fraud before year-end!\n\n${cta}`),
    post('2026-W45-3-en', 'approved', '2026-11-06 20:30', 'facebook,instagram', `[TEST] Instagram needs an image.\n\n${cta}`),
    post('2026-W45-1-zh', 'needs approval', '2026-11-02 20:30', 'facebook', '[TEST] 这一行还没批准，不应该被发布。'),
  ]));

  const lead = (values) => LEAD_COLUMNS.map((c) => values[c] || '');
  writeFileSync(out('fake-data/leads-test.csv'), csv([
    LEAD_COLUMNS,
    lead({ lead_id: 'L-TEST0001', source: 'whatsapp', contact_id: '60100000002', contact_name: 'Test Owner A', first_contact_at: '2026-11-03 21:00', last_inbound_at: '2026-11-03 21:00', last_message: 'Can I see a demo? STOCK', language: 'en', pitch_variant: 'cash_in_stock', intent: 'wants_demo', draft_reply: 'Sure! Which day suits you for a 5-min demo on a fictional sample shop?', status: 'approved', demo_booked: 'yes' }),
    lead({ lead_id: 'L-TEST0002', source: 'messenger', contact_id: 'PSID_TEST_0002', first_contact_at: '2026-10-20 10:00', last_inbound_at: '2026-10-20 10:00', last_message: '多少钱？', language: 'zh', pitch_variant: 'supplier_invoice', intent: 'question', draft_reply: '试点一次性 RM300，大约两个星期。', status: 'approved' }),
    lead({ lead_id: 'L-TEST0003', source: 'whatsapp', contact_id: '60100000003', first_contact_at: '2026-10-28 09:00', last_inbound_at: '2026-10-28 09:00', last_message: 'INVOICE', language: 'en', pitch_variant: 'supplier_invoice', intent: 'wants_demo', status: 'sent', demo_booked: 'yes', pilot_paid: 'yes' }),
  ]));

  writeJson('fake-data/whatsapp-inbound.json', [
    {
      messaging_product: 'whatsapp',
      metadata: { display_phone_number: FAKE_WA_NUMBER, phone_number_id: 'TEST_PHONE_NUMBER_ID' },
      contacts: [{ profile: { name: 'Test Owner B' }, wa_id: '60100000004' }],
      messages: [{ from: '60100000004', id: 'wamid.TEST_INBOUND_1', timestamp: '1762257600', type: 'text', text: { body: 'Hi, I saw your post. Can I try a demo? STOCK' } }],
      field: 'messages',
    },
  ]);
  writeJson('fake-data/whatsapp-inbound-zh-question.json', [
    {
      messaging_product: 'whatsapp',
      metadata: { display_phone_number: FAKE_WA_NUMBER, phone_number_id: 'TEST_PHONE_NUMBER_ID' },
      contacts: [{ profile: { name: '测试老板' }, wa_id: '60100000005' }],
      messages: [{ from: '60100000005', id: 'wamid.TEST_INBOUND_2', timestamp: '1762257700', type: 'text', text: { body: '你好 INVOICE，请问资料会不会外泄？' } }],
      field: 'messages',
    },
  ]);
  writeJson('fake-data/whatsapp-inbound-stop.json', [
    {
      messaging_product: 'whatsapp',
      metadata: { display_phone_number: FAKE_WA_NUMBER, phone_number_id: 'TEST_PHONE_NUMBER_ID' },
      contacts: [{ profile: { name: 'Test Owner C' }, wa_id: '60100000006' }],
      messages: [{ from: '60100000006', id: 'wamid.TEST_INBOUND_3', timestamp: '1762257800', type: 'text', text: { body: 'STOP' } }],
      field: 'messages',
    },
  ]);
  writeJson('fake-data/messenger-inbound.json', [
    {
      id: 'TEST_PAGE_ID',
      time: 1762257900000,
      messaging: [
        { sender: { id: 'PSID_TEST_0007' }, recipient: { id: 'TEST_PAGE_ID' }, timestamp: 1762257900000, message: { mid: 'm_TEST_1', text: 'Not interested, thanks' } },
        { sender: { id: 'TEST_PAGE_ID' }, recipient: { id: 'PSID_TEST_0007' }, timestamp: 1762257900500, message: { mid: 'm_TEST_ECHO', text: 'echo of our own message', is_echo: true } },
      ],
    },
  ]);
  console.log('built fake-data/*');
}

await buildWorkflows();
buildSheetTemplate();
buildFakeData();
