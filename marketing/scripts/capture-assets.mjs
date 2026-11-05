// Captures cropped screenshots of the app on DEMO DATA for the landing page, in English and Chinese.
// Usage: npm run build && npx vite preview --port 4173 &  then  node marketing/scripts/capture-assets.mjs
// Writes PNGs to $OUT (default: marketing/landing/assets/raw); then run convert-assets.sh to make the WebP files.
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
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

/**
 * Burns a "demo data" badge into every capture, so a crop reused anywhere (social posts, ads)
 * still says it comes from the fictional demo shop. Drawn by the browser so Chinese renders.
 */
async function labelAll() {
  const BADGE = { en: 'Demo data · fictional shop', zh: '示范资料 · 虚构店铺' };
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const file of readdirSync(OUT).filter((f) => /^(en|zh)-.*\.png$/.test(f))) {
    const lang = file.slice(0, 2);
    const png = readFileSync(`${OUT}/${file}`).toString('base64');
    // The badge sits on a strip below the image (never over data); its size follows the image width
    // so it stays readable after scaling down to 1200 px.
    await page.setContent(`<!doctype html><html><body style="margin:0">
      <div id="frame" style="display:inline-block;background:#f4f6f4">
        <img id="shot" src="data:image/png;base64,${png}" style="display:block">
        <div id="strip" style="display:flex;justify-content:flex-end">
          <div id="badge" style="background:#fdf3dc;color:#5c3d00;border:2px solid #f0d58a;
            font-weight:700;line-height:1.2;font-family:system-ui,'PingFang SC','Noto Sans SC','WenQuanYi Zen Hei',sans-serif">${BADGE[lang]}</div>
        </div>
      </div></body></html>`);
    await page.locator('#shot').evaluate((img) => img.decode());
    const { width, height } = await page.locator('#shot').evaluate((img) => ({ width: img.naturalWidth, height: img.naturalHeight }));
    await page.locator('#badge').evaluate((el, w) => {
      const size = Math.round(Math.max(26, w / 45));
      Object.assign(el.style, { fontSize: `${size}px`, padding: `${Math.round(size * 0.35)}px ${Math.round(size * 0.7)}px`,
        borderRadius: `${Math.round(size * 0.5)}px` });
      Object.assign(el.parentElement.style, { padding: `${Math.round(size * 0.5)}px ${Math.round(size * 0.8)}px` });
    }, width);
    await page.setViewportSize({ width, height: height + 400 });
    await page.locator('#frame').screenshot({ path: `${OUT}/${file}` });
  }
  await browser.close();
}

mkdirSync(OUT, { recursive: true });
for (const lang of ['en', 'zh']) await capture(lang);
await labelAll();
console.log('captured to', OUT);
