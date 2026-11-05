import { expect, test, type Page } from '@playwright/test';

const FIX = 'tests/fixtures/messy';

async function showRows(page: Page, file: string) {
  const block = page.locator('.issue-file', { hasText: `${file}:` });
  await block.getByRole('button', { name: 'Show rows' }).click();
  return page.getByRole('region', { name: file });
}

test.describe('messy real-world exports', () => {
  test('merged headers, SST columns, subtotals and an Excel stock balance load without manual fixes', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('upload-sales').setInputFiles(`${FIX}/01-pos-sales-detail-merged-header.csv`);
    await expect(page.getByText('Header found on row 6.')).toBeVisible();
    await page.getByTestId('upload-products').setInputFiles(`${FIX}/05-stock-balance-merged-header.xlsx`);
    await page.getByTestId('upload-invoices').setInputFiles(`${FIX}/04-supplier-invoices-sst.csv`);
    await expect(page.getByText('Columns look complete.')).toHaveCount(3);
    // The amount including SST is chosen as the invoice total.
    const invoices = page.locator('section.filecard', { hasText: 'Supplier invoices' });
    await expect(invoices.getByLabel('Total').locator('option:checked')).toContainText('Total incl. SST');

    await page.getByTestId('analyse').click();
    await expect(page.getByText('Rows to check')).toBeVisible({ timeout: 30_000 });

    const sales = await showRows(page, 'Sales');
    await expect(sales.getByText(/"31\/09\/2026 12:30" is not a date we recognise/)).toBeVisible();
    await expect(sales.getByText('Quantity and amount had opposite signs; treated as a refund.')).toBeVisible();

    const products = await showRows(page, 'Products');
    await expect(products.getByText(/Unit cost is 0, so this product is treated as having no cost/)).toBeVisible();
    await expect(products.getByText(/could be day-first or month-first/)).toBeVisible();
    await expect(products.getByText(/Quantity on hand is negative/)).toBeVisible();

    // No raw message keys anywhere on the page.
    await expect(page.locator('body')).not.toContainText('issues.');

    await page.locator('a[href="#/suppliers"]').first().click();
    await expect(page.locator('article.finding', { hasText: 'KB-00501' })).toContainText('SUP-01');
  });

  test('a receipt-type column: refunds count as refunds and voided lines are skipped with a message', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('upload-sales').setInputFiles(`${FIX}/03-sales-us-dates-refund-type.csv`);
    await page.getByTestId('upload-products').setInputFiles(`${FIX}/05-stock-balance-merged-header.xlsx`);
    await expect(page.getByText('Columns look complete.')).toHaveCount(2);
    await page.getByTestId('analyse').click();
    await expect(page.getByText('Rows to check')).toBeVisible({ timeout: 30_000 });
    const sales = await showRows(page, 'Sales');
    await expect(sales.getByText('Voided or cancelled line ("Void") — not counted as a sale.')).toBeVisible();
    await expect(sales.getByRole('cell', { name: '8', exact: true })).toBeVisible();
  });
});
