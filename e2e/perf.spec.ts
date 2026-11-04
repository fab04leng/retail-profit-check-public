import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { bigSalesCsv } from '../tests/perf/bigfile';
import { toCsv } from '../src/core/exportCsv';

test('100,000-row sales file: processed off the main thread, page stays responsive', async ({ page }) => {
  test.setTimeout(180_000);
  const { csv, demo } = bigSalesCsv(100_000);
  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/sales-100k.csv', csv);
  writeFileSync('test-results/products.csv', toCsv(demo.tables.products));
  await page.goto('/');
  // Record main-thread long tasks while the file is read and analysed.
  await page.evaluate(() => {
    const w = window as unknown as { __long: number[] };
    w.__long = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => w.__long.push(e.duration))).observe({ type: 'longtask', buffered: false });
  });
  const t0 = Date.now();
  await page.getByTestId('upload-sales').setInputFiles('test-results/sales-100k.csv');
  await expect(page.getByText('100,000 data rows read')).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('upload-products').setInputFiles('test-results/products.csv');
  await page.getByTestId('analyse').click();
  await expect(page.getByText('Rows to check')).toBeVisible({ timeout: 120_000 });
  const elapsed = Date.now() - t0;
  const longest = await page.evaluate(() => Math.max(0, ...(window as unknown as { __long: number[] }).__long));
  console.log(`100k rows end-to-end: ${elapsed} ms; longest main-thread task ${longest.toFixed(0)} ms`);
  expect(longest).toBeLessThan(1500);
  await page.locator('a[href="#/health"]').first().click();
  await expect(page.getByTestId('headline-belowCost')).toBeVisible();
});
