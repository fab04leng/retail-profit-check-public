// Shared helpers for the marketing capture and video scripts.
// They drive the real app (built with `npm run build`, served by `npx vite preview --port 4173`)
// on its built-in fictional demo data. No real shop data is ever used.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
export const { chromium } = require('playwright');

export const APP_URL = process.env.APP_URL ?? 'http://localhost:4173/';

export async function loadDemo(page, lang = 'en') {
  await page.goto(APP_URL);
  if (lang !== 'en') await page.getByTestId('lang').selectOption(lang);
  await page.getByTestId('load-demo').click();
  await page.waitForURL(/#\/health/, { timeout: 60_000 });
  await page.getByTestId('headline-slowStock').waitFor();
}

export async function go(page, path) {
  await page.evaluate((p) => (location.hash = p), `#/${path}`);
  await page.locator('#page-title').waitFor();
  await page.waitForTimeout(300);
}

/** Bounding box in page coordinates (not viewport). */
export async function pageBox(locator) {
  return locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height };
  });
}
