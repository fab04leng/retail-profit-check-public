/**
 * Weekly report: posts, leads, demos booked and pilots paid per pitch variant.
 * demo_booked and pilot_paid are filled in by hand in the leads tab ("yes" or a date).
 * Plain functions only: inlined into n8n Code nodes by the build.
 */

/* @import-start */
const { parseMyt, formatMyt, DAY_MS } = require('./dates.cjs');
const { PITCHES } = require('./pitches.cjs');
/* @import-end */

const REPORT_VARIANTS = PITCHES.map((p) => ({ id: p.id, label: p.en })).concat([{ id: 'unknown', label: 'Unknown / no code' }]);

function isDone(value) {
  const text = String(value === undefined || value === null ? '' : value).trim();
  if (!text) return false;
  if (/^(?:n|no|false|0|-|cancel\w*)$/i.test(text)) return false;
  return /^(?:y|yes|true|1|✓|✔|booked|done|paid)$/i.test(text) || parseMyt(text) !== null || typeof value === 'number';
}

function variantOf(value) {
  const id = String(value || '').trim();
  return REPORT_VARIANTS.some((v) => v.id === id) ? id : 'unknown';
}

function within(value, from, to) {
  const d = parseMyt(value);
  return Boolean(d && d.getTime() >= from.getTime() && d.getTime() < to.getTime());
}

function buildReport(posts, leads, now) {
  const from = new Date(now.getTime() - 7 * DAY_MS);
  const rows = REPORT_VARIANTS.map((v) => ({
    variant: v.id, label: v.label, drafted_7d: 0, posted_7d: 0, posted_total: 0,
    leads_7d: 0, leads_total: 0, wants_demo_total: 0, demos_booked_total: 0, pilots_paid_total: 0,
  }));
  const byId = new Map(rows.map((r) => [r.variant, r]));
  const attention = { posts_waiting: 0, posts_blocked_or_error: 0, leads_waiting: 0, leads_window_closed: 0 };

  for (const p of posts || []) {
    if (!p || !p.post_id) continue;
    const r = byId.get(variantOf(p.pitch));
    const status = String(p.status || '').trim().toLowerCase();
    if (within(p.created_at, from, now)) r.drafted_7d += 1;
    if (status === 'posted') {
      r.posted_total += 1;
      if (within(p.published_at, from, now)) r.posted_7d += 1;
    }
    if (status === 'needs approval') attention.posts_waiting += 1;
    if (['blocked', 'error', 'needs image'].includes(status)) attention.posts_blocked_or_error += 1;
  }
  for (const l of leads || []) {
    if (!l || !l.lead_id) continue;
    const r = byId.get(variantOf(l.pitch_variant));
    const status = String(l.status || '').trim().toLowerCase();
    if (status === 'no message yet') continue; // opened the chat but never wrote: not a lead
    r.leads_total += 1;
    if (within(l.first_contact_at, from, now)) r.leads_7d += 1;
    if (String(l.intent).trim() === 'wants_demo') r.wants_demo_total += 1;
    if (isDone(l.demo_booked)) r.demos_booked_total += 1;
    if (isDone(l.pilot_paid)) r.pilots_paid_total += 1;
    if (status === 'needs approval') attention.leads_waiting += 1;
    if (status === 'window closed') attention.leads_window_closed += 1;
  }
  const totals = rows.reduce((t, r) => {
    for (const k of Object.keys(r)) if (typeof r[k] === 'number') t[k] = (t[k] || 0) + r[k];
    return t;
  }, { variant: 'total', label: 'Total' });
  const period = `${formatMyt(from)} – ${formatMyt(now)} (Malaysia time)`;
  return { period, rows, totals, attention, text: reportText(period, rows, totals, attention), html: reportHtml(period, rows, totals, attention) };
}

function reportText(period, rows, totals, attention) {
  const line = (r) => `• ${r.label}: posts ${r.posted_7d} this week (${r.posted_total} total) | leads ${r.leads_7d} this week (${r.leads_total} total) | wants demo ${r.wants_demo_total} | demos booked ${r.demos_booked_total} | pilots paid ${r.pilots_paid_total}`;
  return [
    'Retail Profit Check – weekly marketing report',
    period,
    '',
    ...rows.map(line),
    '',
    line(totals),
    '',
    'Waiting for you:',
    `• Posts to approve: ${attention.posts_waiting}`,
    `• Posts blocked / error / need image: ${attention.posts_blocked_or_error}`,
    `• Lead replies to approve: ${attention.leads_waiting}`,
    `• Leads past the 24h reply window: ${attention.leads_window_closed}`,
    '',
    'Counts come from the Google Sheet. "Demos booked" and "pilots paid" are what you entered in the leads tab.',
  ].join('\n');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function reportHtml(period, rows, totals, attention) {
  const cols = [
    ['label', 'Pitch'], ['posted_7d', 'Posts (7d)'], ['posted_total', 'Posts (all)'], ['leads_7d', 'Leads (7d)'], ['leads_total', 'Leads (all)'],
    ['wants_demo_total', 'Wants demo'], ['demos_booked_total', 'Demos booked'], ['pilots_paid_total', 'Pilots paid'],
  ];
  const cell = (v, bold) => `<td style="padding:4px 8px;border:1px solid #ccc;${bold ? 'font-weight:bold;' : ''}">${escapeHtml(v)}</td>`;
  const tr = (r, bold) => `<tr>${cols.map(([k]) => cell(r[k], bold)).join('')}</tr>`;
  return [
    '<h2 style="font-family:sans-serif">Retail Profit Check – weekly marketing report</h2>',
    `<p style="font-family:sans-serif">${escapeHtml(period)}</p>`,
    '<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">',
    `<tr>${cols.map(([, h]) => `<th style="padding:4px 8px;border:1px solid #ccc;background:#f2f2f2">${escapeHtml(h)}</th>`).join('')}</tr>`,
    ...rows.map((r) => tr(r, false)),
    tr(totals, true),
    '</table>',
    '<h3 style="font-family:sans-serif">Waiting for you</h3>',
    '<ul style="font-family:sans-serif">',
    `<li>Posts to approve: ${attention.posts_waiting}</li>`,
    `<li>Posts blocked / error / need image: ${attention.posts_blocked_or_error}</li>`,
    `<li>Lead replies to approve: ${attention.leads_waiting}</li>`,
    `<li>Leads past the 24h reply window: ${attention.leads_window_closed}</li>`,
    '</ul>',
    '<p style="font-family:sans-serif;color:#555">Counts come from the Google Sheet. "Demos booked" and "pilots paid" are what you entered in the leads tab.</p>',
  ].join('\n');
}

/* @export-start */
module.exports = { buildReport, isDone, REPORT_VARIANTS };
/* @export-end */
