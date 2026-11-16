/**
 * Browser regression tests for the QA review of 13 Nov 2026. These started as the reproduction
 * kit's probes, which asserted the faulty behaviour; they now assert the fixed behaviour.
 */
import { expect, test, type Page } from '@playwright/test';
import { go, loadDemo } from './helpers';

async function upload(page: Page, kind: string, name: string, csv: string) {
  await page.getByTestId('upload-' + kind).setInputFiles({ name, mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await expect(page.getByTestId('upload-' + kind)).toBeEnabled();
}

async function tiny(page: Page, price = 4) {
  await go(page, 'start');
  await upload(page, 'sales', 'sales.csv', `Date,SKU,Qty,Total\n2026-11-01,A,1,${price}\n`);
  await upload(page, 'products', 'stock.csv', 'SKU,Name,Unit Cost,Qty On Hand\nA,Test product,10,1\n');
  await page.getByTestId('analyse').click();
  await expect(page.getByRole('link', { name: 'See the health check' })).toBeVisible();
}

test('B01: a confirmation does not carry over to changed data with the same name and layout', async ({ page }) => {
  await page.goto('/');
  await tiny(page, 4);
  await page.getByTestId('review-mode').check();
  await go(page, 'profit');
  const finding = page.locator('article.finding').first();
  await expect(finding).toContainText('RM 6.00');
  await finding.getByRole('button', { name: 'Confirmed', exact: true }).click();
  await expect(finding.getByRole('button', { name: 'Confirmed', exact: true })).toHaveAttribute('aria-pressed', 'true');

  // Same file name, same headers, same row count — different total.
  await go(page, 'start');
  await upload(page, 'sales', 'sales.csv', 'Date,SKU,Qty,Total\n2026-11-01,A,1,1\n');
  await page.getByTestId('analyse').click();
  await go(page, 'profit');
  const changed = page.locator('article.finding').first();
  await expect(changed).toContainText('RM 9.00');
  await expect(changed.getByRole('button', { name: 'Confirmed', exact: true })).toHaveAttribute('aria-pressed', 'false');

  // Going back to the original file brings its review back.
  await go(page, 'start');
  await upload(page, 'sales', 'sales.csv', 'Date,SKU,Qty,Total\n2026-11-01,A,1,4\n');
  await page.getByTestId('analyse').click();
  await go(page, 'profit');
  await expect(page.locator('article.finding').first().getByRole('button', { name: 'Confirmed', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('B08: "confirmed only" applies to the CSV export as well as the appendix', async ({ page }) => {
  await page.goto('/');
  await tiny(page, 4);
  await page.getByTestId('review-mode').check();
  await go(page, 'profit');
  await page.locator('article.finding').first().getByRole('button', { name: 'Not an issue', exact: true }).click();
  await go(page, 'report');
  await page.getByRole('checkbox', { name: /Show confirmed/ }).check();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /CSV/ }).click();
  const dl = await downloadPromise;
  const text = await (await dl.createReadStream()).toArray().then((c) => Buffer.concat(c).toString('utf8'));
  const lines = text.trim().split(/\r?\n/);
  expect(lines).toHaveLength(1); // header only: the rejected finding is not exported
});

test('B02: unreadable sales cannot produce a clean-looking owner report', async ({ page }) => {
  await page.goto('/');
  await upload(page, 'sales', 'sales.csv', 'Date,SKU,Qty,Total\n2026-11-01,A,oops,50\n');
  await upload(page, 'products', 'stock.csv', 'SKU,Name,Unit Cost,Qty On Hand\nA,Test product,10,1\n');
  await page.getByTestId('analyse').click();
  await expect(page.getByText(/1 skipped/)).toBeVisible();
  await go(page, 'report');
  await expect(page.getByTestId('data-quality')).toContainText('No report');
  await expect(page.getByTestId('data-quality')).toContainText('Sales');
  await expect(page.locator('.report-key')).toHaveCount(0); // no key numbers to mistake for a clean result
  await go(page, 'health');
  await expect(page.getByTestId('data-quality')).toBeVisible();
});

test('B02: partly unreadable files are disclosed on page 1 of the report', async ({ page }) => {
  await page.goto('/');
  await upload(page, 'sales', 'sales.csv', 'Date,SKU,Qty,Total\n2026-11-01,A,1,50\n2026-11-02,A,oops,50\n');
  await upload(page, 'products', 'stock.csv', 'SKU,Name,Unit Cost,Qty On Hand\nA,Test product,10,1\n');
  await page.getByTestId('analyse').click();
  await go(page, 'report');
  const dq = page.locator('.report-page').getByTestId('data-quality');
  await expect(dq).toContainText('1 rows could not be read');
  await expect(dq).toContainText('No payments file');
  await expect(page.locator('.report-key')).toBeVisible();
});

test('B07: slow-stock findings show a readable message in every language', async ({ page }) => {
  await loadDemo(page);
  for (const lang of ['en', 'zh', 'ms']) {
    await page.getByTestId('lang').selectOption(lang);
    await go(page, 'stock');
    await expect(page.locator('main')).not.toContainText('findingText.');
    await go(page, 'report');
    await expect(page.locator('main')).not.toContainText('findingText.');
  }
  await page.getByTestId('lang').selectOption('en');
});

test('B11: the dead-stock headline follows the edited threshold', async ({ page }) => {
  await loadDemo(page);
  await go(page, 'rules');
  await page.getByTestId('threshold-deadStockDays').fill('180');
  await page.getByTestId('threshold-deadStockDays').blur();
  await expect(page.locator('#rule-STK-02')).toContainText('Flagged 21 times');
  await go(page, 'health');
  await expect(page.getByTestId('headline-slowStock')).toContainText('21 of them');
  await expect(page.getByTestId('headline-slowStock')).toContainText('more than 180 days');
  await go(page, 'rules');
  await page.getByRole('button', { name: 'Reset all to defaults' }).click();
});

test('B12: a category loss is labelled with its real negative amount', async ({ page }) => {
  await page.goto('/');
  await tiny(page, 1);
  await go(page, 'profit');
  await expect(page.locator('.hbar-value').first()).toContainText('−RM 9.00'); // typographic minus, as formatRM writes it
  await expect(page.locator('.hbar-value').first()).not.toContainText('RM 0.00');
});
