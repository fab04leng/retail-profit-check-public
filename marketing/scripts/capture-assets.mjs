// Captures cropped screenshots of the app on DEMO DATA for the landing page, in English and Chinese.
// Usage: npm run build && npx vite preview --port 4173 &  then  node marketing/scripts/capture-assets.mjs
// Writes PNGs to $OUT (default: marketing/landing/assets/raw); then run convert-assets.sh to make the WebP files.
import { mkdirSync } from 'node:fs';
import { chromium, go, loadDemo, pageBox } from './lib.mjs';

const OUT = process.env.OUT ?? 'marketing/landing/assets/raw';
const PAD = 12;

async function clipShot(page, file, top, bottom, { x = null, width = null, padTop = PAD } = {}) {
  const t = await pageBox(top);
  const b = bottom ? await pageBox(bottom) : t;
  const left = x ?? t.x - PAD;
  const clip = {
    x: Math.max(0, left),
    y: Math.max(0, t.y - padTop),
    width: width ?? t.width + PAD * 2,
    height: b.y + b.height - t.y + padTop + PAD,
  };
  await page.screenshot({ path: `${OUT}/${file}`, clip, fullPage: true });
}

async function capture(lang) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
  await loadDemo(page, lang);
  await page.addStyleTag({ content: '.nav, header{position:static !important}' });

  // Health check: demo banner + the five headline cards.
  const cards = await pageBox(page.locator('.headlines'));
  await clipShot(page, `${lang}-health.png`, page.locator('.demo-banner'), page.locator('.headlines'), {
    x: cards.x - PAD,
    width: cards.width + PAD * 2,
    padTop: 0,
  });

  // Hero images: captured at a narrow (phone-like) width so the text stays readable when scaled down.
  const narrow = await browser.newPage({ viewport: { width: 560, height: 900 }, deviceScaleFactor: 2 });
  await loadDemo(narrow, lang);
  await narrow.addStyleTag({ content: '.nav, header{position:static !important}' });

  // Profit: "Sold below cost" heading + first two findings.
  await go(narrow, 'profit');
  await clipShot(narrow, `${lang}-profit.png`, narrow.locator('h2.section-title').first(), narrow.locator('article.finding').nth(1));

  // Stock: value-by-age chart card + the biggest dead-stock finding.
  await go(narrow, 'stock');
  const ageCard = narrow.locator('h2').first().locator('xpath=ancestor::*[contains(@class,"card")][1]');
  await clipShot(narrow, `${lang}-stock.png`, ageCard, narrow.locator('article.finding').first());

  // Suppliers: SUP-01 heading + first two findings.
  await go(narrow, 'suppliers');
  await clipShot(narrow, `${lang}-suppliers.png`, narrow.locator('h2.section-title').first(), narrow.locator('article.finding').nth(1));
  await narrow.close();

  // Suppliers page on the wide view, for the evidence dialog below.
  await go(page, 'suppliers');

  // Evidence dialog: the exact source rows behind a finding.
  await page.getByRole('button', { name: lang === 'zh' ? '显示原始行' : 'Show source rows' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  await page.waitForTimeout(300);
  await dialog.screenshot({ path: `${OUT}/${lang}-evidence.png` });
  await page.keyboard.press('Escape');

  // Cash flow: estimated weekly balance chart.
  await go(page, 'cashflow');
  const chartCard = page.locator('h2').nth(1).locator('xpath=ancestor::*[contains(@class,"card")][1]');
  await chartCard.screenshot({ path: `${OUT}/${lang}-cashflow.png` });

  await browser.close();
}

mkdirSync(OUT, { recursive: true });
for (const lang of ['en', 'zh']) await capture(lang);
console.log('captured to', OUT);
