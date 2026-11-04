// Unit tests for the logic that the build inlines into n8n Code nodes.
// Run: node --test marketing-agent/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { checkCompliance, formatFlags } = require('../src/lib/compliance.cjs');
const dates = require('../src/lib/dates.cjs');
const pitches = require('../src/lib/pitches.cjs');
const { parseConfig, requireConfigured, isPlaceholder } = require('../src/lib/config.cjs');
const llm = require('../src/lib/llm.cjs');
const posts = require('../src/lib/posts.cjs');
const leads = require('../src/lib/leads.cjs');
const replies = require('../src/lib/replies.cjs');
const report = require('../src/lib/report.cjs');

const WA = '60100000001'; // fictional test number
const cfg = (over = {}) => parseConfig(Object.entries({ WHATSAPP_NUMBER: WA, ...over }).map(([key, value]) => ({ key, value })));
const blockIds = (text) => checkCompliance(text, { allowedPhones: [WA] }).block.map((b) => b.id);
const warnIds = (text) => checkCompliance(text, { allowedPhones: [WA] }).warn.map((w) => w.id);

// ---------- compliance ----------
test('blocks the word fraud and accusation words in EN, ZH and BM', () => {
  assert.deepEqual(blockIds('Catch supplier fraud early'), ['B1']);
  assert.deepEqual(blockIds('员工偷货怎么办'), ['B1']);
  assert.deepEqual(blockIds('供应商诈骗'), ['B1']);
  assert.deepEqual(blockIds('Elak penipuan pembekal'), ['B1']);
});

test('blocks "replaces your accountant" claims', () => {
  assert.deepEqual(blockIds('This replaces your accountant'), ['B2']);
  assert.deepEqual(blockIds('No need for an accountant anymore'), ['B2']);
  assert.deepEqual(blockIds('用了就不需要会计'), ['B2']);
});

test('blocks tax advice but allows the "not tax advice" disclaimer', () => {
  assert.deepEqual(blockIds('Save tax this year with our check'), ['B3']);
  assert.deepEqual(blockIds('Tax tips for retailers'), ['B3']);
  assert.deepEqual(blockIds('教你怎样省税'), ['B3']);
  assert.deepEqual(blockIds('Ready for LHDN e-invoicing'), ['B3']);
  assert.deepEqual(blockIds('This is an analysis aid, not tax advice.'), []);
  assert.deepEqual(blockIds('这不是税务建议。'), []);
});

test('blocks guarantees but allows "we can\'t guarantee"', () => {
  assert.deepEqual(blockIds('Guaranteed savings!'), ['B4']);
  assert.deepEqual(blockIds('We will save you RM5,000'), ['B4']);
  assert.deepEqual(blockIds('我们保证你省钱'), ['B4']);
  assert.deepEqual(blockIds('老板不用担心，我们保证找到问题'), ['B4'], 'a distant 不 must not excuse 保证');
  assert.deepEqual(blockIds("We can't guarantee any particular saving."), []);
  assert.deepEqual(blockIds('我们不保证一定能省多少。'), []);
});

test('blocks AI claims about the product, audit claims, emails, placeholders and other phone numbers', () => {
  assert.deepEqual(blockIds('Our AI-powered profit check'), ['B5']);
  assert.deepEqual(blockIds('No AI guessing: plain rules.'), []);
  assert.deepEqual(blockIds('Get audited accounts in a week'), ['B6']);
  assert.deepEqual(blockIds('Not audited accounts.'), []);
  assert.deepEqual(blockIds('Email owner@example.com'), ['B7']);
  assert.deepEqual(blockIds('WhatsApp https://wa.me/60XXXXXXXXX?text=STOCK'), ['B8']);
  assert.deepEqual(blockIds('Call Ah Seng at 012-345 6789'), ['B9']);
  assert.deepEqual(blockIds(`WhatsApp us: https://wa.me/${WA}?text=STOCK`), []);
});

test('warns on RM figures without a demo label, pressure words and too many hashtags', () => {
  assert.ok(warnIds('We found RM4,200 of dead stock').includes('W1'));
  assert.ok(!warnIds('In our demo shop (fictional data) we found RM4,200 of dead stock').includes('W1'));
  assert.ok(!warnIds('Pilot fee RM300 one-off').includes('W1'), 'the real pilot price is not demo data');
  assert.ok(warnIds('Act now before it is too late').includes('W3'));
  assert.ok(warnIds('#a1 #b2 #c3 #d4 #e5').includes('W4'));
});

test('formatFlags is empty for clean text and lists BLOCK before CHECK', () => {
  assert.equal(formatFlags(checkCompliance('Hello boss, how is business?')), '');
  const flags = formatFlags(checkCompliance('Guaranteed! We found RM9,000'));
  assert.match(flags, /^BLOCK B4: .* \| CHECK W1/);
});

// ---------- dates ----------
test('ISO week and slot dates use Malaysia time', () => {
  // Sunday 2026-11-08 17:00 UTC is Monday 2026-11-09 01:00 in Malaysia: week 46, not 45.
  assert.equal(dates.weekId(dates.isoWeekOf(new Date('2026-11-08T17:00:00Z'))), '2026-W46');
  assert.equal(dates.weekId(dates.isoWeekOf(new Date('2026-11-08T15:00:00Z'))), '2026-W45');
  assert.equal(dates.slotDateTime({ year: 2026, week: 46 }, 'Wed', '20:30'), '2026-11-11 20:30');
  assert.equal(dates.weekId(dates.isoWeekOf(new Date('2027-01-01T04:00:00Z'))), '2026-W53');
});

test('parseMyt reads the formats Google Sheets can return', () => {
  const expected = new Date('2026-11-09T12:30:00Z').getTime();
  assert.equal(dates.parseMyt('2026-11-09 20:30').getTime(), expected);
  assert.equal(dates.parseMyt('09/11/2026 20:30:00').getTime(), expected);
  assert.equal(dates.parseMyt('2026-11-09T12:30:00Z').getTime(), expected);
  assert.equal(dates.formatMyt(dates.parseMyt(46335.854166666664)), '2026-11-09 20:30');
  assert.equal(dates.parseMyt(''), null);
  assert.equal(dates.parseMyt('next Tuesday'), null);
});

// ---------- pitches ----------
test('pitch order rotates every week and covers all three pitches', () => {
  const ids = (w) => pitches.pitchOrderForWeek(w).map((p) => p.code).join(',');
  assert.equal(ids(45), 'PROFIT,STOCK,INVOICE');
  assert.equal(ids(46), 'STOCK,INVOICE,PROFIT');
  assert.equal(ids(47), 'INVOICE,PROFIT,STOCK');
});

test('detectPitch uses the m.me ref, "ref:" text or an upper-case code only', () => {
  assert.equal(pitches.detectPitch('hi', 'STOCK'), 'cash_in_stock');
  assert.equal(pitches.detectPitch('Hi (ref: invoice)'), 'supplier_invoice');
  assert.equal(pitches.detectPitch('PROFIT'), 'profit_by_product');
  assert.equal(pitches.detectPitch('I have too much stock'), 'unknown');
  assert.equal(pitches.detectPitch('你好 STOCK'), 'cash_in_stock');
});

// ---------- config ----------
test('config parses booleans and numbers and reports placeholders clearly', () => {
  const c = parseConfig([{ key: 'dry_run', value: 'FALSE' }, { key: 'WEEK_OFFSET', value: '0' }, { key: 'LLM_BASE_URL', value: 'https://x.test/v1/' }]);
  assert.equal(c.DRY_RUN, false);
  assert.equal(c.WEEK_OFFSET, 0);
  assert.equal(c.LLM_BASE_URL, 'https://x.test/v1');
  assert.equal(c.USE_FAKE_LLM, true, 'defaults to the fake LLM');
  assert.ok(isPlaceholder(c.FB_PAGE_ID));
  assert.throws(() => requireConfigured(c, ['FB_PAGE_ID', 'LLM_BASE_URL'], 'test'), /FB_PAGE_ID in the "config" tab/);
  assert.throws(() => parseConfig([{ key: 'DRY_RUN', value: 'maybe' }]), /TRUE or FALSE/);
});

// ---------- llm ----------
test('parseJsonLoose handles fenced JSON and reports garbage', () => {
  assert.deepEqual(llm.parseJsonLoose('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(llm.parseJsonLoose('Sure! {"a":2} Hope this helps'), { a: 2 });
  assert.throws(() => llm.parseJsonLoose('no json here'), /valid JSON/);
  assert.throws(() => llm.extractContent({ error: { message: 'bad key' } }), /bad key/);
});

// ---------- posts ----------
test('fake content becomes 6 "needs approval" rows with CTA, tracking code and no BLOCK flags', () => {
  const c = cfg();
  const plan = posts.buildSlots(c, new Date('2026-11-06T02:00:00Z')); // Friday 10:00 MYT, week 45 → plan week 46
  assert.equal(plan.week, '2026-W46');
  const rows = posts.postsToRows(posts.fakeContent(plan, ['en', 'zh']), plan, c, new Date('2026-11-06T02:00:00Z'));
  assert.equal(rows.length, 6);
  for (const r of rows) {
    assert.equal(r.status, 'needs approval');
    assert.match(r.text, new RegExp(`wa\\.me/${WA}\\?text=(PROFIT|STOCK|INVOICE)`));
    assert.ok(!/BLOCK/.test(r.compliance_flags), `${r.post_id}: ${r.compliance_flags}`);
    assert.deepEqual(Object.keys(r), posts.POST_COLUMNS);
  }
  assert.equal(rows[0].post_id, '2026-W46-1-en');
  assert.equal(rows[0].pitch, 'cash_in_stock');
  assert.equal(rows[0].scheduled_for, '2026-11-09 20:30');
});

test('postsToRows rejects LLM output with a missing slot or language', () => {
  const c = cfg();
  const plan = posts.buildSlots(c, new Date('2026-11-06T02:00:00Z'));
  const content = posts.fakeContent(plan, ['en', 'zh']);
  delete content.posts[1].zh;
  assert.throws(() => posts.postsToRows(content, plan, c, new Date()), /missing the zh body for slot 2/);
  assert.throws(() => posts.postsToRows({ posts: [] }, plan, c, new Date()), /missing slot 1/);
});

const baseRow = { post_id: 'P1', status: 'approved', scheduled_for: '2026-11-09 20:30', channels: 'facebook', text: 'Hello boss', image_url: '' };
const at = (iso) => new Date(iso);

test('pickNextPost publishes only approved rows that are due, one per run', () => {
  const c = cfg({ DRY_RUN: 'TRUE' });
  const rows = [
    { ...baseRow, post_id: 'P2', scheduled_for: '2026-11-09 21:00' },
    { ...baseRow },
    { ...baseRow, post_id: 'P3', status: 'needs approval' },
    { ...baseRow, post_id: 'P4', scheduled_for: '2026-11-20 20:30' },
  ];
  const before = posts.pickNextPost(rows, at('2026-11-09T12:00:00Z'), c);
  assert.equal(before.publish, null, 'nothing due yet at 20:00 MYT');
  const after = posts.pickNextPost(rows, at('2026-11-09T13:30:00Z'), c);
  assert.equal(after.publish.post_id, 'P1');
  assert.deepEqual(after.updates, []);
});

test('pickNextPost re-checks brand rules, needs an image for Instagram and refuses fake posts when live', () => {
  const now = at('2026-11-10T00:00:00Z');
  const live = cfg({ DRY_RUN: 'FALSE' });
  const blocked = posts.pickNextPost([{ ...baseRow, text: 'Stop supplier fraud now' }], now, live);
  assert.equal(blocked.publish, null);
  assert.equal(blocked.updates[0].status, 'blocked');
  const ig = posts.pickNextPost([{ ...baseRow, channels: 'facebook,instagram' }], now, live);
  assert.equal(ig.updates[0].status, 'needs image');
  const fake = posts.pickNextPost([{ ...baseRow, text: '[FAKE LLM TEST] hi' }], now, live);
  assert.equal(fake.updates[0].status, 'blocked');
  const badUrl = posts.pickNextPost([{ ...baseRow, image_url: 'http://x.test/a.jpg' }], now, live);
  assert.equal(badUrl.updates[0].status, 'error');
});

test('publishOutcome never re-approves a partly posted row', () => {
  const post = { post_id: 'P1', wants_facebook: true, wants_instagram: true };
  const ok = posts.publishOutcome(post, { facebook: { id: '1_2' }, instagram: { id: '9' } }, at('2026-11-10T00:00:00Z'), false);
  assert.equal(ok.status, 'posted');
  const partial = posts.publishOutcome(post, { facebook: { id: '1_2' }, instagram: { error: { message: 'bad image' } } }, at('2026-11-10T00:00:00Z'), false);
  assert.equal(partial.status, 'error');
  assert.equal(partial.fb_post_id, '1_2');
  assert.match(partial.error, /Partly posted/);
});

// ---------- leads ----------
const waPayload = {
  messaging_product: 'whatsapp',
  metadata: { phone_number_id: 'TEST_PHONE_ID' },
  contacts: [{ wa_id: '60100000002', profile: { name: 'Test Owner' } }],
  messages: [{ from: '60100000002', id: 'wamid.TEST1', timestamp: '1762740000', type: 'text', text: { body: 'Hi, can I see a demo? STOCK' } }],
  field: 'messages',
};

test('normalises WhatsApp and Messenger webhooks and ignores echoes and receipts', () => {
  const wa = leads.normaliseWhatsApp([waPayload]);
  assert.equal(wa.length, 1);
  assert.equal(wa[0].text, 'Hi, can I see a demo? STOCK');
  assert.equal(wa[0].contact_name, 'Test Owner');
  const fb = leads.normaliseMessenger([
    {
      id: 'PAGE1',
      messaging: [
        { sender: { id: 'PSID1' }, recipient: { id: 'PAGE1' }, timestamp: 1762740000000, message: { mid: 'm1', text: '想了解多一点' } },
        { sender: { id: 'PAGE1' }, recipient: { id: 'PSID1' }, timestamp: 1762740000001, message: { mid: 'm2', text: 'echo', is_echo: true } },
        { sender: { id: 'PSID1' }, recipient: { id: 'PAGE1' }, timestamp: 1762740000002, read: { watermark: 1 } },
      ],
    },
  ], 'PAGE1');
  assert.equal(fb.length, 1);
  assert.equal(fb[0].source, 'messenger');
});

test('prepareLeads drops duplicate deliveries and finds language, pitch and opt-outs', () => {
  const msgs = leads.normaliseWhatsApp([waPayload]);
  const prepared = leads.prepareLeads(msgs, [], cfg());
  assert.equal(prepared.length, 1);
  assert.equal(prepared[0].pitch_variant, 'cash_in_stock');
  assert.equal(prepared[0].is_new, true);
  const again = leads.prepareLeads(msgs, [{ lead_id: prepared[0].lead_id, last_message_id: 'wamid.TEST1' }], cfg());
  assert.equal(again.length, 0, 'same message id delivered twice is ignored');
  const stop = leads.prepareLeads([{ ...msgs[0], message_id: 'x', text: 'STOP' }], [], cfg());
  assert.equal(stop[0].mode, 'opt_out');
  assert.equal(leads.detectLanguage('请问怎么收费'), 'zh');
  assert.equal(leads.detectLanguage('Boleh saya tahu harga?'), 'ms');
  assert.ok(!String(prepared[0].lead_id).includes('60100000002'), 'lead id does not expose the number');
});

test('finaliseLead drafts for approval, adds a privacy line for new leads and handles opt-out', () => {
  const lead = leads.prepareLeads(leads.normaliseWhatsApp([waPayload]), [], cfg())[0];
  const row = leads.finaliseLead(lead, leads.fakeClassify(lead), cfg(), new Date());
  assert.equal(row.intent, 'wants_demo');
  assert.equal(row.status, 'needs approval');
  assert.match(row.draft_reply, /Reply STOP anytime/);
  assert.equal(row.first_contact_at !== undefined, true);
  assert.equal(row.demo_booked, undefined, 'manual columns are never overwritten');
  const optOut = leads.finaliseLead({ ...lead, mode: 'opt_out' }, null, cfg(), new Date());
  assert.equal(optOut.do_not_contact, 'yes');
  assert.equal(optOut.intent, 'not_interested');
  const weird = leads.finaliseLead(lead, { intent: 'buy_now', draft_reply: 'We guarantee results' }, cfg(), new Date());
  assert.equal(weird.intent, 'question');
  assert.match(weird.compliance_flags, /not recognised/);
  assert.match(weird.compliance_flags, /BLOCK B4/);
});

// ---------- replies ----------
const leadRow = { lead_id: 'L-1', source: 'whatsapp', contact_id: '60100000002', status: 'approved', draft_reply: 'Thanks! Which day suits you?', last_inbound_at: '2026-11-09 10:00', intent: 'question', do_not_contact: '' };

test('pickReplies sends only approved replies inside the 24h window', () => {
  const c = cfg({ DRY_RUN: 'FALSE' });
  const ok = replies.pickReplies([leadRow, { ...leadRow, lead_id: 'L-2', status: 'needs approval' }], at('2026-11-09T12:00:00Z'), c);
  assert.equal(ok.send.length, 1);
  const late = replies.pickReplies([leadRow], at('2026-11-10T12:00:00Z'), c);
  assert.equal(late.send.length, 0);
  assert.equal(late.updates[0].status, 'window closed');
  // 25h after their message: still refused even though config asks for 48h.
  const capped = replies.pickReplies([leadRow], at('2026-11-10T03:00:00Z'), cfg({ REPLY_WINDOW_HOURS: '48' }));
  assert.equal(capped.updates[0].status, 'window closed', 'window can never exceed 24h');
});

test('pickReplies respects do_not_contact and brand rules, and caps replies per run', () => {
  const now = at('2026-11-09T03:00:00Z');
  const c = cfg({ DRY_RUN: 'FALSE', MAX_REPLIES_PER_RUN: '2' });
  assert.equal(replies.pickReplies([{ ...leadRow, do_not_contact: 'yes' }], now, c).updates[0].status, 'blocked');
  const ack = replies.pickReplies([{ ...leadRow, do_not_contact: 'yes', intent: 'not_interested' }], now, c);
  assert.equal(ack.send.length, 1, 'one acknowledgement of an opt-out is allowed');
  assert.equal(replies.pickReplies([{ ...leadRow, draft_reply: 'Save tax with us' }], now, c).updates[0].status, 'blocked');
  const many = Array.from({ length: 5 }, (_, i) => ({ ...leadRow, lead_id: `L-${i}` }));
  assert.equal(replies.pickReplies(many, now, c).send.length, 2);
});

test('replyOutcome removes personal data after an opt-out acknowledgement is sent', () => {
  const out = replies.replyOutcome({ lead_id: 'L-1', opt_out_ack: true }, { messages: [{ id: 'wamid.X' }] }, at('2026-11-09T03:00:00Z'), false);
  assert.equal(out.status, 'sent');
  assert.equal(out.contact_id, replies.SCRUBBED);
  const failed = replies.replyOutcome({ lead_id: 'L-1' }, { error: { message: 'Re-engagement message' } }, new Date(), false);
  assert.equal(failed.status, 'error');
});

// ---------- report ----------
test('weekly report counts posts, leads, demos and pilots per pitch variant', () => {
  const now = at('2026-11-16T00:00:00Z');
  const r = report.buildReport(
    [
      { post_id: 'a', pitch: 'cash_in_stock', status: 'posted', published_at: '2026-11-11 20:30', created_at: '2026-11-06 10:00' },
      { post_id: 'b', pitch: 'cash_in_stock', status: 'posted', published_at: '2026-10-01 20:30' },
      { post_id: 'c', pitch: 'profit_by_product', status: 'needs approval', created_at: '2026-11-13 10:00' },
    ],
    [
      { lead_id: 'L1', pitch_variant: 'cash_in_stock', first_contact_at: '2026-11-12 09:00', intent: 'wants_demo', demo_booked: 'yes', pilot_paid: '2026-11-14' },
      { lead_id: 'L2', pitch_variant: 'supplier_invoice', first_contact_at: '2026-11-01 09:00', intent: 'question', demo_booked: 'no' },
      { lead_id: 'L3', pitch_variant: 'mystery', first_contact_at: '2026-11-13 09:00', status: 'needs approval' },
      { lead_id: 'L4', pitch_variant: 'cash_in_stock', status: 'no message yet' },
    ],
    now,
  );
  const stock = r.rows.find((x) => x.variant === 'cash_in_stock');
  assert.equal(stock.posted_7d, 1);
  assert.equal(stock.posted_total, 2);
  assert.equal(stock.leads_total, 1, 'chats opened without a message are not leads');
  assert.equal(stock.demos_booked_total, 1);
  assert.equal(stock.pilots_paid_total, 1);
  assert.equal(r.rows.find((x) => x.variant === 'unknown').leads_7d, 1);
  assert.equal(r.totals.leads_total, 3);
  assert.equal(r.attention.posts_waiting, 1);
  assert.match(r.text, /Cash stuck in stock: posts 1 this week \(2 total\)/);
  assert.match(r.html, /<table/);
});
