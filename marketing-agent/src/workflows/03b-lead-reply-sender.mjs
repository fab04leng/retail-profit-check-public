// Workflow 3b – Lead reply sender.
// Every 20 minutes (08:00–23:40 Malaysia time) it sends replies you approved in the "leads"
// tab, back to the person who messaged us, on the same channel. Only within 24 hours of their
// last message (the WhatsApp / Messenger customer-service window). Never starts a conversation,
// never sends templates or broadcasts.
import {
  workflow, settingsNode, readSheetNode, writeSheetNode, setStatusNode, loadConfigNode, codeNode, ifNode, graphPostNode, sticky, scheduleCron, CFG, CRED, V,
} from '../n8n.mjs';

export default function build() {
  const w = workflow('03b-lead-reply-sender', 'RPC 3b – Lead reply sender (approved replies only, 24h window)', { saveDataSuccessExecution: 'none' });

  sticky(w, 'About this workflow', [-120, -460], [
    '## 3b. Reply sender (approved replies only)',
    'Runs **every 20 minutes, 08:00–23:40** (Malaysia time). For each lead with `status` = **approved**:',
    '- sends `draft_reply` to that person on the channel they used (WhatsApp or Messenger);',
    '- **only if their last message was less than 24 h ago** (else **window closed**: nothing is sent);',
    '- never if `do_not_contact` = yes (except the one acknowledgement of their STOP);',
    '- re-checks the brand rules on the reply (else **blocked**); at most `MAX_REPLIES_PER_RUN`.',
    '',
    'After an opt-out acknowledgement is sent, their number and message are deleted from the sheet.',
    'With `DRY_RUN` = TRUE nothing is sent; rows become **sent (dry run)**.',
  ].join('\n'), { width: 560, height: 320, color: 4 });

  scheduleCron(w, 'Every 20 min 08:00–23:40', [0, 0], '*/20 8-23 * * *');
  settingsNode(w, [220, 0]);
  readSheetNode(w, 'Read config', 'config', [440, 0]);
  loadConfigNode(w, [660, 0]);
  readSheetNode(w, 'Read leads', 'leads', [880, 0]);

  codeNode(w, 'Pick replies', [1100, 0], ['replies', 'config'], `
// Approved replies that may be sent now, and status updates for those that may not.
const config = $('Load config').first().json;
const { send, updates } = pickReplies($input.all().map((item) => item.json), new Date(), config);
if (send.length && !config.DRY_RUN) {
  const needed = [];
  if (send.some((s) => s.source === 'whatsapp')) needed.push('WA_PHONE_NUMBER_ID');
  if (send.some((s) => s.source === 'messenger')) needed.push('FB_PAGE_ID', 'GRAPH_API_VERSION');
  requireConfigured(config, needed, 'needed to send replies');
}
return updates.map((u) => ({ json: Object.assign({ _action: 'update' }, u) }))
  .concat(send.map((s) => ({ json: Object.assign({ _action: 'send' }, s) })));
`);
  ifNode(w, 'Send this one?', [1320, 0], "$json._action === 'send'");
  setStatusNode(w, 'Mark sending', 'leads', 'lead_id', 'sending', [1540, -120]);
  codeNode(w, 'Reply to send', [1760, -120], [], `
// The reply picked above (the sheet update node returns its own output, so read it back here).
return { json: $('Pick replies').item.json };
`, { perItem: true });
  ifNode(w, 'Dry run?', [1980, -120], CFG('DRY_RUN'));
  codeNode(w, 'Simulate send', [2200, -300], [], `
// DRY_RUN: nothing is sent.
return { json: { id: 'dry-run-' + $json.lead_id } };
`, { perItem: true });
  ifNode(w, 'WhatsApp?', [2200, -60], "$json.source === 'whatsapp'");
  w.add('Send WhatsApp reply', 'n8n-nodes-base.whatsApp', V.whatsApp, [2420, -160], {
    resource: 'message',
    operation: 'send',
    phoneNumberId: `={{ ${CFG('WA_PHONE_NUMBER_ID')} }}`,
    recipientPhoneNumber: '={{ $json.contact_id }}',
    messageType: 'text',
    textBody: '={{ $json.reply }}',
    additionalFields: {},
  }, { credentials: CRED.whatsApp, onError: 'continueRegularOutput', webhookId: '5b7d9f1a-3c5e-4a7b-9d2f-4e6a8c0b2d4f' });
  graphPostNode(w, 'Send Messenger reply', [2420, 40], `{{ ${CFG('FB_PAGE_ID')} }}/messages`, "{ recipient: { id: $json.contact_id }, messaging_type: 'RESPONSE', message: { text: $json.reply } }");

  codeNode(w, 'Record result', [2640, -120], ['replies'], `
// sent / sent (dry run) / error, with the platform's message id. Opt-out acknowledgements remove personal data.
const config = $('Load config').first().json;
const item = $('Reply to send').item.json;
return { json: replyOutcome(item, $json, new Date(), config.DRY_RUN) };
`, { perItem: true });
  writeSheetNode(w, 'Update lead row', 'leads', 'update', 'lead_id', [2860, 0]);

  w.chain('Every 20 min 08:00–23:40', 'Settings', 'Read config', 'Load config', 'Read leads', 'Pick replies', 'Send this one?');
  w.link('Send this one?', 'Mark sending', 0);
  w.link('Send this one?', 'Update lead row', 1);
  w.chain('Mark sending', 'Reply to send', 'Dry run?');
  w.link('Dry run?', 'Simulate send', 0);
  w.link('Dry run?', 'WhatsApp?', 1);
  w.link('WhatsApp?', 'Send WhatsApp reply', 0);
  w.link('WhatsApp?', 'Send Messenger reply', 1);
  w.link('Simulate send', 'Record result');
  w.link('Send WhatsApp reply', 'Record result');
  w.link('Send Messenger reply', 'Record result');
  w.link('Record result', 'Update lead row');
  return w;
}
