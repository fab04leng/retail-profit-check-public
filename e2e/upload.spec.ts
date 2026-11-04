import { expect, test } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { shot, SHOTS } from './helpers';

test.describe('uploading own files', () => {
  test('Malay headers, title rows and bad rows: mapping, analysis and row-numbered issues', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('upload-sales').setInputFiles('e2e/fixtures/jualan-bm.csv');
    await expect(page.getByText('data rows read from jualan-bm.csv')).toBeVisible();
    await expect(page.getByText('Header found on row 3.')).toBeVisible();
    await page.getByTestId('upload-products').setInputFiles('e2e/fixtures/stok-bm.csv');
    await expect(page.getByText('Columns look complete.')).toHaveCount(2);
    await shot(page, `${SHOTS}/16-upload-mapping.png`);
    await page.getByTestId('analyse').click();
    await expect(page.getByText('Rows to check')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/3 skipped/)).toBeVisible();
    await page.getByRole('button', { name: 'Show rows' }).first().click();
    const table = page.getByRole('region', { name: 'Sales' });
    await expect(table.getByRole('cell', { name: '6', exact: true })).toBeVisible(); // 31/02/2026 is on spreadsheet row 6
    await expect(table.getByText(/is not a date we recognise/)).toBeVisible();
    await shot(page, `${SHOTS}/17-upload-issues.png`);
    await page.locator('a[href="#/profit"]').first().click();
    await expect(page.getByText('Kopi O 1kg').first()).toBeVisible();
    // Kopi O sold at 24.50 with cost 25.00 → below cost.
    await expect(page.locator('article.finding', { hasText: 'Kopi O 1kg' })).toContainText('PRF-02');
  });

  test('wrong columns can be fixed by hand and are remembered for the same layout', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('upload-payments').setInputFiles('e2e/fixtures/odd-headers.csv');
    await expect(page.getByText(/Please choose a column for/)).toBeVisible();
    const card = page.locator('section.filecard', { hasText: 'Payments made' });
    await card.getByLabel('Date').selectOption({ label: 'A: Col1' });
    await card.getByLabel('Supplier').selectOption({ label: 'B: Col2' });
    await card.getByLabel('Amount paid').selectOption({ label: 'C: Col3' });
    await expect(card.getByText('Columns look complete.')).toBeVisible();
    await page.reload();
    await page.getByTestId('upload-payments').setInputFiles('e2e/fixtures/odd-headers.csv');
    await expect(page.getByText('Using the columns you chose last time for this file layout.')).toBeVisible();
  });

  test('unsupported files get a friendly message, not a crash', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('upload-sales').setInputFiles('e2e/fixtures/old.xls');
    await expect(page.getByRole('alert').filter({ hasText: 'Old Excel (.xls) files are not supported' })).toBeVisible();
  });

  test('downloads a blank template', async ({ page }) => {
    await page.goto('/');
    const [d] = await Promise.all([page.waitForEvent('download'), page.locator('section.filecard', { hasText: 'Sales export' }).getByRole('button', { name: /Blank template/ }).click()]);
    expect(d.suggestedFilename()).toBe('template-sales.csv');
  });

  test('a crafted file with HTML/script in cells is shown as text only', async ({ page }) => {
    mkdirSync('test-results', { recursive: true });
    writeFileSync('test-results/xss.csv', 'Date,SKU,Product Name,Qty,Total\n01/02/2026,X1,"<img src=x onerror=window.__pwned=1>",1,5\n');
    writeFileSync('test-results/xss-stock.csv', 'SKU,Product Name,Unit Cost,Qty On Hand\nX1,"<script>window.__pwned=2</script>",9,1\n');
    await page.goto('/');
    await page.getByTestId('upload-sales').setInputFiles('test-results/xss.csv');
    await page.getByTestId('upload-products').setInputFiles('test-results/xss-stock.csv');
    await page.getByTestId('analyse').click();
    await page.locator('a[href="#/profit"]').first().click();
    await expect(page.getByText('<script>window.__pwned=2</script>').first()).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
  });
});

test('a SQL Account style invoice export is recognised as an unverified layout and mapped', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('upload-invoices').setInputFiles('e2e/fixtures/sqlaccount-pi.csv');
  await expect(page.getByTestId('detected-invoices')).toContainText('SQL Account');
  await expect(page.getByTestId('detected-invoices')).toContainText('unverified');
  const card = page.locator('section.filecard', { hasText: 'Supplier invoices' });
  await expect(card.getByText('Columns look complete.')).toBeVisible();
  await expect(card.getByLabel('Invoice no.')).toHaveValue('0');
  await expect(card.locator('tr', { hasText: 'Supplier' }).locator('select')).toHaveValue('2');
  await expect(page.getByTestId('layout').locator('option')).toHaveCount(5);
});
