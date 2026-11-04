import type { Page } from '@playwright/test';

export const SHOTS = 'docs/screenshots';

export async function loadDemo(page: Page) {
  await page.goto('/');
  await page.getByTestId('load-demo').click();
  await page.waitForURL(/#\/health/, { timeout: 60_000 });
  await page.getByTestId('headline-slowStock').waitFor();
}

export async function go(page: Page, path: string) {
  await page.evaluate((p) => (location.hash = p), `#/${path}`);
  await page.locator('#page-title').waitFor();
}

/** Full-page screenshot without the sticky navigation repeating mid-page. */
export async function shot(page: Page, path: string, fullPage = true) {
  await page.addStyleTag({ content: '.nav{position:static !important}' });
  await page.screenshot({ path, fullPage });
}
