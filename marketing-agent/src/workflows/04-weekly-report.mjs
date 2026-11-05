// Workflow 4 – Weekly report.
// Every Monday 08:00 (Malaysia time): counts of posts, leads, demos booked and pilots paid per
// pitch variant (last 7 days and all time), plus what is waiting for approval. Sent to you by
// email and/or Telegram (REPORT_CHANNEL in the config tab).
import {
  workflow, settingsNode, readSheetNode, loadConfigNode, codeNode, ifNode, sticky, scheduleCron, CRED, V,
} from '../n8n.mjs';

export default function build() {
  const w = workflow('04-weekly-report', 'RPC 4 – Weekly report (posts, leads, demos, pilots per pitch)');

  sticky(w, 'About this workflow', [-120, -400], [
    '## 4. Weekly report',
    'Runs **every Monday 08:00** (Malaysia time). Per pitch variant (profit by product / cash stuck in stock / supplier invoice mistakes / unknown):',
    '- posts published (last 7 days and all time)',
    '- leads (last 7 days and all time), leads who wanted a demo',
    '- **demos booked** and **pilots paid**: what you typed in the leads tab (`yes` or a date)',
    '',
    'Plus what is waiting for you (drafts and replies to approve, blocked posts, closed reply windows).',
    'Where it goes: `REPORT_CHANNEL` = email, telegram or both (config tab).',
  ].join('\n'), { width: 560, height: 300, color: 4 });

  scheduleCron(w, 'Every Monday 08:00', [0, 0], '0 8 * * 1');
  settingsNode(w, [220, 0]);
  readSheetNode(w, 'Read config', 'config', [440, 0]);
  loadConfigNode(w, [660, 0]);
  readSheetNode(w, 'Read posts', 'posts', [880, 0]);
  readSheetNode(w, 'Read leads', 'leads', [1100, 0]);

  codeNode(w, 'Build report', [1320, 0], ['report', 'config'], `
const config = $('Load config').first().json;
const posts = $('Read posts').all().map((item) => item.json);
const leads = $('Read leads').all().map((item) => item.json);
const channel = String(config.REPORT_CHANNEL || '').trim().toLowerCase();
if (!['email', 'telegram', 'both'].includes(channel)) throw new Error('REPORT_CHANNEL must be email, telegram or both (config tab).');
if (channel !== 'telegram') requireConfigured(config, ['REPORT_EMAIL_TO', 'REPORT_EMAIL_FROM'], 'needed to email the report');
if (channel !== 'email') requireConfigured(config, ['TELEGRAM_CHAT_ID'], 'needed to send the report to Telegram');
const report = buildReport(posts, leads, new Date());
return [{
  json: {
    subject: 'Retail Profit Check – weekly marketing report',
    text: report.text,
    html: report.html,
    send_email: channel !== 'telegram',
    send_telegram: channel !== 'email',
    period: report.period,
    rows: report.rows,
    totals: report.totals,
    attention: report.attention,
  },
}];
`);
  ifNode(w, 'Email it?', [1540, -100], '$json.send_email');
  ifNode(w, 'Telegram it?', [1540, 120], '$json.send_telegram');
  w.add('Send report email', 'n8n-nodes-base.emailSend', V.email, [1760, -120], {
    resource: 'email',
    operation: 'send',
    fromEmail: "={{ $('Load config').first().json.REPORT_EMAIL_FROM }}",
    toEmail: "={{ $('Load config').first().json.REPORT_EMAIL_TO }}",
    subject: '={{ $json.subject }}',
    emailFormat: 'both',
    text: '={{ $json.text }}',
    html: '={{ $json.html }}',
    options: { appendAttribution: false },
  }, { credentials: CRED.smtp, webhookId: '7e9a1c3b-5d7f-4b9a-8c1e-3f5a7b9d1e2f' });
  w.add('Send report to Telegram', 'n8n-nodes-base.telegram', V.telegram, [1760, 120], {
    resource: 'message',
    operation: 'sendMessage',
    chatId: "={{ $('Load config').first().json.TELEGRAM_CHAT_ID }}",
    text: '={{ $json.text }}',
    additionalFields: { appendAttribution: false },
  }, { credentials: CRED.telegram, webhookId: '2d4f6a8c-0e1b-4c3d-9e5f-7a9b1c3d5e7f' });

  w.chain('Every Monday 08:00', 'Settings', 'Read config', 'Load config', 'Read posts', 'Read leads', 'Build report');
  w.link('Build report', 'Email it?');
  w.link('Build report', 'Telegram it?');
  w.link('Email it?', 'Send report email', 0);
  w.link('Telegram it?', 'Send report to Telegram', 0);
  return w;
}
