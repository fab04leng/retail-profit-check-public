/**
 * Reply sender: approved replies to people who messaged us, only inside the platform's
 * 24-hour customer-service window. Never sends to anyone who has not written to us.
 * Plain functions only: inlined into n8n Code nodes by the build.
 */

/* @import-start */
const { parseMyt, formatMyt } = require('./dates.cjs');
const { checkCompliance, formatFlags } = require('./compliance.cjs');
const { LEAD_STATUS } = require('./leads.cjs');
/* @import-end */

const HARD_MAX_WINDOW_HOURS = 24;
const HARD_MAX_REPLIES_PER_RUN = 10;
const SCRUBBED = '[deleted on request]';

function isYes(value) {
  return /^(?:y|yes|true|1|✓|✔)$/i.test(String(value === undefined || value === null ? '' : value).trim());
}

function pickReplies(rows, now, config) {
  const send = [];
  const updates = [];
  const windowHours = Math.min(Number(config.REPLY_WINDOW_HOURS) || 23, HARD_MAX_WINDOW_HOURS);
  const maxPerRun = Math.max(1, Math.min(Number(config.MAX_REPLIES_PER_RUN) || 5, HARD_MAX_REPLIES_PER_RUN));
  const approved = (rows || []).filter((r) => r && r.lead_id && String(r.status || '').trim().toLowerCase() === LEAD_STATUS.approved);
  for (const row of approved) {
    const fail = (status, error) => updates.push({ lead_id: row.lead_id, status, error });
    const reply = String(row.draft_reply || '').trim();
    const source = String(row.source || '').trim().toLowerCase();
    if (!reply) { fail(LEAD_STATUS.error, 'draft_reply is empty. Write a reply, then approve again.'); continue; }
    if (!row.contact_id || String(row.contact_id) === SCRUBBED) { fail(LEAD_STATUS.error, 'No contact_id (details were deleted). Nothing was sent.'); continue; }
    if (source !== 'whatsapp' && source !== 'messenger') { fail(LEAD_STATUS.error, `Unknown source "${row.source}".`); continue; }
    const optOutAck = isYes(row.do_not_contact) && String(row.intent).trim() === 'not_interested';
    if (isYes(row.do_not_contact) && !optOutAck) {
      fail(LEAD_STATUS.blocked, 'do_not_contact is yes. Clear it only if this person asked for a reply.');
      continue;
    }
    if (/\[FAKE LLM TEST\]/.test(reply) && !config.DRY_RUN) { fail(LEAD_STATUS.blocked, 'Fake test reply. Rewrite it before sending for real.'); continue; }
    const last = parseMyt(row.last_inbound_at);
    if (!last) { fail(LEAD_STATUS.error, `Cannot read last_inbound_at "${row.last_inbound_at}".`); continue; }
    const ageHours = (now.getTime() - last.getTime()) / 3600000;
    if (ageHours > windowHours) {
      fail(
        LEAD_STATUS.windowClosed,
        `Their last message was ${Math.floor(ageHours)}h ago. WhatsApp and Messenger only allow normal replies within 24h of their last message, so nothing was sent. Reply from your phone if still suitable, or wait until they write again.`,
      );
      continue;
    }
    const check = checkCompliance(reply, { allowedPhones: [config.WHATSAPP_NUMBER], maxLength: 1500 });
    if (check.block.length) {
      updates.push({ lead_id: row.lead_id, status: LEAD_STATUS.blocked, compliance_flags: formatFlags({ block: check.block, warn: [] }), error: 'Blocked by a brand rule. Edit draft_reply, then approve again.' });
      continue;
    }
    if (send.length >= maxPerRun) continue; // stays approved; next run sends it
    send.push({ lead_id: row.lead_id, source, contact_id: String(row.contact_id), reply, opt_out_ack: optOutAck });
  }
  return { send, updates };
}

/** Row update after a send attempt. After an opt-out acknowledgement, personal data is removed. */
function replyOutcome(item, result, now, dryRun) {
  const id = result && (result.id || result.message_id || (Array.isArray(result.messages) && result.messages[0] && result.messages[0].id));
  if (!id) {
    const e = result && result.error;
    const message = !e ? 'no message id in the response' : typeof e === 'string' ? e : e.message || JSON.stringify(e);
    return { lead_id: item.lead_id, status: LEAD_STATUS.error, error: `Send failed: ${String(message).slice(0, 300)}` };
  }
  const row = {
    lead_id: item.lead_id,
    status: dryRun ? LEAD_STATUS.sentDryRun : LEAD_STATUS.sent,
    reply_sent_at: formatMyt(now),
    reply_message_id: String(id),
    error: '',
  };
  if (item.opt_out_ack && !dryRun) {
    row.contact_id = SCRUBBED;
    row.contact_name = SCRUBBED;
    row.last_message = SCRUBBED;
    row.draft_reply = SCRUBBED;
    row.last_message_id = SCRUBBED;
  }
  return row;
}

/* @export-start */
module.exports = { pickReplies, replyOutcome, isYes, SCRUBBED, HARD_MAX_WINDOW_HOURS };
/* @export-end */
