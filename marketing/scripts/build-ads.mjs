// Builds marketing/ads/ad-copy.md and marketing/ads/ads.csv from ads-data.mjs.
// Run: npm run marketing:ads
import { mkdirSync, writeFileSync } from 'node:fs';
import { ADS, ANGLES } from './ads-data.mjs';

const OUT = 'marketing/ads';
const LANDING = 'https://<your-landing-page>/';
const PITCH_NAME = { a: 'A · See your real profit by product', b: 'B · Free up cash stuck in stock', c: 'C · Catch costly supplier invoice mistakes' };
const CTA_BUTTON = { en: 'Send WhatsApp message', zh: 'Send WhatsApp message (发送 WhatsApp 消息)' };
const HEADLINE_MAX = { en: 40, zh: 20 };

const prefill = (lang, ref) =>
  lang === 'zh' ? `你好！我看到你们的广告（ref ${ref}），想看 5 分钟演示。` : `Hi! I saw your ad (ref ${ref}). I'd like the 5-minute demo.`;

const rows = [];
for (const pitch of ['a', 'b', 'c']) {
  if (ADS[pitch].length !== 5) throw new Error(`pitch ${pitch}: expected 5 variants`);
  ADS[pitch].forEach((ad, i) => {
    const n = i + 1;
    for (const lang of ['en', 'zh']) {
      const copy = ad[lang];
      const chars = [...copy.headline].length;
      if (chars > HEADLINE_MAX[lang]) throw new Error(`${pitch}${n}-${lang}: headline is ${chars} characters (max ${HEADLINE_MAX[lang]})`);
      const src = `ad-${pitch}${n}-${lang}`;
      const ref = `${pitch.toUpperCase()}-${src}`;
      rows.push({
        ad_id: `${pitch.toUpperCase()}${n}-${lang.toUpperCase()}`,
        ad_set: `Pitch ${pitch.toUpperCase()}`,
        pitch: pitch.toUpperCase(),
        variant: n,
        angle: ANGLES[n],
        language: lang === 'zh' ? 'ZH' : 'EN',
        primary_text: copy.primary,
        primary_chars: [...copy.primary].length,
        headline: copy.headline,
        description: copy.description,
        cta_button: CTA_BUTTON[lang],
        creative: ad.creative,
        ref_code: ref,
        whatsapp_prefill: prefill(lang, ref),
        landing_url: `${LANDING}?v=${pitch}&lang=${lang}&src=${src}`,
        status: 'draft',
      });
    }
  });
}

// ---------- Markdown ----------
const md = [];
md.push('# Facebook & Instagram ad copy');
md.push('');
md.push('Generated from `marketing/scripts/ads-data.mjs` by `npm run marketing:ads`. **Edit the data file, not this file.** The same ads are in [`ads.csv`](ads.csv). Targeting, the RM500 test budget and the stop/scale rules are in [`README.md`](README.md).');
md.push('');
md.push('- **5 variants per pitch × EN + 中文 = 30 ads.** Angles: 1 question hook · 2 demo-data example · 3 accountant/trust · 4 timely or practical · 5 offer and process.');
md.push('- **Destination:** click-to-WhatsApp (button "Send WhatsApp message") with the prefilled message below, so the ref code arrives with the first message. If you use the landing page instead, use the landing URL (same ref code).');
md.push('- **Every figure is from the fictional demo shop and says so in the ad.** Never imply anything about the viewer\'s finances (Meta "personal attributes" policy): no "Is your shop losing money?".');
md.push('- Keep the first ~125 characters of the primary text strong; that\'s what shows before "See more".');
md.push('');
for (const pitch of ['a', 'b', 'c']) {
  md.push(`## Pitch ${PITCH_NAME[pitch]}`);
  md.push('');
  ADS[pitch].forEach((ad, i) => {
    const n = i + 1;
    const en = rows.find((r) => r.ad_id === `${pitch.toUpperCase()}${n}-EN`);
    const zh = rows.find((r) => r.ad_id === `${pitch.toUpperCase()}${n}-ZH`);
    md.push(`### ${pitch.toUpperCase()}${n} · ${ANGLES[n]}`);
    md.push('');
    md.push(`**Creative:** ${ad.creative}`);
    md.push('');
    md.push('| | English | 中文 |');
    md.push('|---|---|---|');
    md.push(`| **Primary text** | ${en.primary_text} | ${zh.primary_text} |`);
    md.push(`| **Headline** | ${en.headline} | ${zh.headline} |`);
    md.push(`| **Description** | ${en.description} | ${zh.description} |`);
    md.push(`| **Button** | Send WhatsApp message | Send WhatsApp message |`);
    md.push(`| **WhatsApp prefill** | ${en.whatsapp_prefill} | ${zh.whatsapp_prefill} |`);
    md.push(`| **Landing URL** | \`${en.landing_url}\` | \`${zh.landing_url}\` |`);
    md.push('');
  });
}

// ---------- CSV ----------
const COLUMNS = Object.keys(rows[0]);
const cell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = [COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((c) => cell(r[c])).join(','))];

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/ad-copy.md`, `${md.join('\n')}\n`);
writeFileSync(`${OUT}/ads.csv`, `﻿${csv.join('\r\n')}\r\n`);
console.log(`wrote ${OUT}/ad-copy.md and ${OUT}/ads.csv (${rows.length} ads)`);
