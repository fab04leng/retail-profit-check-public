import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('offline build opens by double-click (file://) and works without a server', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`file://${resolve('dist-offline/index.html')}`);
  await page.getByTestId('load-demo').click();
  await expect(page.getByTestId('headline-belowCost')).toContainText('RM 3,130.27', { timeout: 60_000 });
  await page.evaluate(() => (location.hash = '#/suppliers'));
  await page.getByRole('button', { name: 'Show source rows' }).first().click();
  await expect(page.locator('dialog tbody tr').first()).toBeVisible();
  expect(errors).toEqual([]);
});
