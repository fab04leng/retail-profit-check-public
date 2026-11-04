// Builds marketing/social/posts.md and marketing/social/content-calendar.csv from social-data.mjs.
// Run: npm run marketing:social
import { mkdirSync, writeFileSync } from 'node:fs';
import { POSTS, START_DATE } from './social-data.mjs';

const OUT = 'marketing/social';
const LANDING = 'https://<your-landing-page>/'; // placeholder until the landing page is deployed
const PITCH = ['a', 'b', 'c'];
const PITCH_NAME = { a: 'A · Real profit by product', b: 'B · Cash stuck in stock', c: 'C · Supplier invoice mistakes' };
const TAGS = {
  common: { en: '#Penang #PenangBusiness #RetailMalaysia #SMEMalaysia #ShopOwner', zh: '#槟城 #马来西亚生意 #开店老板' },
  a: { en: '#ProfitMargin #RetailTips', zh: '#毛利 #定价' },
  b: { en: '#InventoryManagement #DeadStock', zh: '#库存管理 #清货' },
  c: { en: '#SupplierInvoices #Bookkeeping', zh: '#对账 #供应商发票' },
};
const XHS_TAGS = '#马来西亚 #槟城 #马来西亚创业 #开店老板 #零售 #生意经';
// Xiaohongshu restricts off-platform contact details: no WhatsApp, phone numbers or links in posts.
const XHS_CTA = ['想看 5 分钟示范，私信我们～', '有问题欢迎留言，或直接私信我们', '私信"示范"两个字，我们回你'];
const TIMES = { facebook: '21:00', instagram: '21:00', xiaohongshu: '20:00' };

if (POSTS.length !== 30) throw new Error(`expected 30 posts, got ${POSTS.length}`);

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

const posts = POSTS.map((p, i) => {
  const date = addDays(START_DATE, i);
  const pitch = PITCH[i % 3];
  const day = i + 1;
  const dd = String(day).padStart(2, '0');
  if ([...p.xhsTitle].length > 20) throw new Error(`day ${day}: XHS title longer than 20 characters`);
  return {
    ...p,
    day,
    pitch,
    iso: date.toISOString().slice(0, 10),
    weekday: date.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }),
    pretty: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }),
    refFb: `${pitch.toUpperCase()}-fb-d${dd}`,
    linkFb: `${LANDING}?v=${pitch}&lang=en&src=fb-d${dd}`,
    xhsCta: XHS_CTA[i % XHS_CTA.length],
  };
});

function facebook(p) {
  return [
    p.en.hook, '', p.en.body, '', `${p.en.cta} 👉 ${p.linkFb}`,
    '', '—', '',
    p.zh.hook, '', p.zh.body, '', p.zh.cta,
  ].join('\n');
}

function instagram(p) {
  return [
    p.en.hook, '', p.en.body, '', `${p.en.cta} (Link in bio.)`,
    '', '—', '',
    p.zh.hook, '', p.zh.body, '', `${p.zh.cta}（链接在主页）`,
    '', `${TAGS.common.en} ${TAGS[p.pitch].en} ${TAGS.common.zh} ${TAGS[p.pitch].zh}`,
  ].join('\n');
}

function xhs(p) {
  return [`标题：${p.xhsTitle}`, '', `📌 ${p.zh.hook}`, '', p.zh.body, '', `👉 ${p.xhsCta}`, '', `${XHS_TAGS} ${TAGS[p.pitch].zh}`].join('\n');
}

// ---------- Markdown ----------
const md = [];
md.push(`# 30 days of social posts (${posts[0].pretty} – ${posts.at(-1).pretty} 2026)`);
md.push('');
md.push('Generated from `marketing/scripts/social-data.mjs` by `npm run marketing:social`. **Edit the data file, not this file.** The same posts are in [`content-calendar.csv`](content-calendar.csv) for scheduling.');
md.push('');
md.push('**Rules:** read [`../BRIEF.md`](../BRIEF.md). Every figure is from the **fictional demo shop** and says so in the same paragraph. No testimonials, no claims about AI or wrongdoing, no savings promises. Day 13 uses the accountant\'s name and photo: post it only after they approve.');
md.push('');
md.push('| Platform | Language | Format | Call to action | Suggested time |');
md.push('|---|---|---|---|---|');
md.push(`| Facebook page | One bilingual post (EN, then 中文) | Text + visual | Landing link with a per-post ref code (\`src=fb-dNN\`) | ${TIMES.facebook} (after closing) |`);
md.push(`| Instagram | Bilingual caption + hashtags | Same visual (4:5 crop) or Reel | "Link in bio": point the bio link to \`?src=ig\` | ${TIMES.instagram} |`);
md.push(`| Xiaohongshu | 中文 only | Visual or 9:16 clip, title ≤ 20 characters | Comment or DM only: **no WhatsApp, phone number or link** | ${TIMES.xiaohongshu} |`);
md.push('');
md.push('Pitches rotate daily: **A** real profit by product → **B** cash stuck in stock → **C** supplier invoice mistakes. Replace `https://<your-landing-page>/` with the real address once it is deployed. When someone messages, log the ref code in `marketing/tracking/leads.csv`.');
md.push('');
md.push('| Day | Date | Pitch | Format | Hook (EN) |');
md.push('|---:|---|---|---|---|');
for (const p of posts) md.push(`| ${p.day} | ${p.pretty} | ${p.pitch.toUpperCase()} | ${p.format} | [${p.en.hook.replace(/\|/g, '\\|')}](#day-${p.day}) |`);
md.push('');
for (const p of posts) {
  md.push('---');
  md.push('');
  md.push(`<a id="day-${p.day}"></a>`);
  md.push('');
  md.push(`## Day ${p.day} · ${p.pretty} · ${PITCH_NAME[p.pitch]}`);
  md.push('');
  md.push(`- **Format:** ${p.format}`);
  md.push(`- **Visual:** ${p.visual}`);
  md.push(`- **Asset:** ${p.asset}`);
  md.push(`- **Ref codes:** Facebook \`${p.refFb}\` · Instagram \`${p.pitch.toUpperCase()}-ig\` · Xiaohongshu \`${p.pitch.toUpperCase()}-xhs\``);
  md.push('');
  md.push('| | English | 中文 |');
  md.push('|---|---|---|');
  md.push(`| **Hook** | ${p.en.hook} | ${p.zh.hook} |`);
  md.push(`| **Body** | ${p.en.body} | ${p.zh.body} |`);
  md.push(`| **Call to action** | ${p.en.cta} | ${p.zh.cta} |`);
  md.push('');
  md.push('<details><summary>Ready-to-paste: Facebook · Instagram · Xiaohongshu</summary>');
  md.push('');
  md.push('**Facebook**');
  md.push('');
  md.push('```text');
  md.push(facebook(p));
  md.push('```');
  md.push('');
  md.push('**Instagram**');
  md.push('');
  md.push('```text');
  md.push(instagram(p));
  md.push('```');
  md.push('');
  md.push('**小红书**');
  md.push('');
  md.push('```text');
  md.push(xhs(p));
  md.push('```');
  md.push('');
  md.push('</details>');
  md.push('');
}

// ---------- CSV ----------
const COLUMNS = ['day', 'date', 'weekday', 'time', 'platform', 'language', 'pitch', 'format', 'hook', 'body', 'cta', 'hashtags', 'visual', 'asset', 'ref_code', 'link', 'post_text', 'status'];
const cell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const rows = [COLUMNS.join(',')];
for (const p of posts) {
  const both = (k) => `${p.en[k]}\n${p.zh[k]}`;
  const common = { day: p.day, date: p.iso, weekday: p.weekday, pitch: p.pitch.toUpperCase(), format: p.format, visual: p.visual, asset: p.asset, status: 'draft' };
  const lines = [
    { ...common, time: TIMES.facebook, platform: 'Facebook', language: 'EN + ZH', hook: both('hook'), body: both('body'), cta: both('cta'), hashtags: '', ref_code: p.refFb, link: p.linkFb, post_text: facebook(p) },
    { ...common, time: TIMES.instagram, platform: 'Instagram', language: 'EN + ZH', hook: both('hook'), body: both('body'), cta: both('cta'), hashtags: `${TAGS.common.en} ${TAGS[p.pitch].en} ${TAGS.common.zh} ${TAGS[p.pitch].zh}`, ref_code: `${p.pitch.toUpperCase()}-ig`, link: `${LANDING}?v=${p.pitch}&src=ig (bio link)`, post_text: instagram(p) },
    { ...common, time: TIMES.xiaohongshu, platform: 'Xiaohongshu', language: 'ZH', hook: `${p.xhsTitle}\n${p.zh.hook}`, body: p.zh.body, cta: p.xhsCta, hashtags: `${XHS_TAGS} ${TAGS[p.pitch].zh}`, ref_code: `${p.pitch.toUpperCase()}-xhs`, link: '(none: DM only)', post_text: xhs(p) },
  ];
  for (const r of lines) rows.push(COLUMNS.map((c) => cell(r[c])).join(','));
}

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/posts.md`, `${md.join('\n')}\n`);
// UTF-8 BOM so Excel opens the Chinese text correctly.
writeFileSync(`${OUT}/content-calendar.csv`, `﻿${rows.join('\r\n')}\r\n`);
console.log(`wrote ${OUT}/posts.md and ${OUT}/content-calendar.csv (${rows.length - 1} rows)`);
