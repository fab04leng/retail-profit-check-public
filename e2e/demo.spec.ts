import { expect, test } from '@playwright/test';
import { go, loadDemo, shot, SHOTS } from './helpers';

const PAGES = [
  ['health', 'Health check'],
  ['profit', 'Profit by product and category'],
  ['stock', 'Cash trapped in stock'],
  ['suppliers', 'Supplier invoice checks'],
  ['outlets', 'Outlet comparison'],
  ['cashflow', '8-week cash-flow outlook'],
  ['findings', 'All findings'],
  ['rules', 'Rules'],
] as const;

test.describe('demo journey', () => {
  test('start page explains privacy and offers the demo', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Your data never leaves this computer').first()).toBeVisible();
    await expect(page.getByTestId('load-demo')).toBeVisible();
    await shot(page, `${SHOTS}/01-start.png`);
  });

  test('load demo → every page → evidence → screenshots', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await loadDemo(page);
    await expect(page.getByTestId('headline-belowCost')).toContainText('RM 3,130.27');
    await expect(page.getByTestId('headline-duplicates')).toContainText('6 possible duplicates');
    await expect(page.getByTestId('headline-cashLow')).toContainText('Estimate');
    await expect(page.getByText('Demo data — Pinangria Mart').first()).toBeVisible();
    let n = 2;
    for (const [path, title] of PAGES) {
      await go(page, path);
      await expect(page.locator('#page-title')).toHaveText(title);
      await shot(page, `${SHOTS}/${String(n++).padStart(2, '0')}-${path}.png`);
    }
    // Evidence: the exact source rows behind a finding.
    await go(page, 'suppliers');
    await page.getByRole('button', { name: 'Show source rows' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('columnheader', { name: 'Invoice No' })).toBeVisible();
    await expect(dialog.locator('tbody tr')).not.toHaveCount(0);
    await page.screenshot({ path: `${SHOTS}/10-evidence-dialog.png` });
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    expect(errors).toEqual([]);
  });

  test('headline links to the findings behind it', async ({ page }) => {
    await loadDemo(page);
    await page.getByTestId('headline-duplicates').getByRole('link', { name: /See evidence/ }).click();
    await expect(page.getByText('6 findings')).toBeVisible();
    await expect(page.locator('article.finding')).toHaveCount(6);
  });

  test('switch language to Chinese and Malay', async ({ page }) => {
    await loadDemo(page);
    await page.getByTestId('lang').selectOption('zh');
    await expect(page.locator('#page-title')).toHaveText('健康检查');
    await expect(page.getByText('您的资料不会离开这台电脑').first()).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans');
    await shot(page, `${SHOTS}/11-health-zh.png`);
    await go(page, 'rules');
    await page.screenshot({ path: `${SHOTS}/12-rules-zh.png` });
    await page.getByTestId('lang').selectOption('ms');
    await go(page, 'health');
    await expect(page.locator('#page-title')).toHaveText('Semakan kesihatan');
    await page.screenshot({ path: `${SHOTS}/13-health-ms.png` });
    // Remembered after reload.
    await page.reload();
    await expect(page.getByTestId('lang')).toHaveValue('ms');
  });

  test('accountant review mode counts confirmed findings in the report', async ({ page }) => {
    await loadDemo(page);
    await page.getByTestId('review-mode').check();
    await go(page, 'suppliers');
    const first = page.locator('article.finding').first();
    await first.getByRole('button', { name: 'Confirmed' }).click();
    await expect(first.getByRole('button', { name: 'Confirmed' })).toHaveAttribute('aria-pressed', 'true');
    await first.getByRole('textbox').fill('Checked with supplier statement; credit note requested.');
    await first.getByRole('textbox').blur();
    const second = page.locator('article.finding').nth(1);
    await second.getByRole('button', { name: 'Not an issue' }).click();
    await page.screenshot({ path: `${SHOTS}/14-review-mode.png` });
    await go(page, 'report');
    await expect(page.getByText(/^1 confirmed \(RM [\d,.]+\) · 1 not an issue · 0 need info · \d+ not yet reviewed$/)).toBeVisible();
    await expect(page.getByText('Checked with supplier statement; credit note requested.')).toBeVisible();
  });

  test('changing a rule threshold re-runs the analysis', async ({ page }) => {
    await loadDemo(page);
    await go(page, 'rules');
    const fired = page.locator('#rule-PRF-03').getByText(/Flagged \d+ times/);
    const before = Number((await fired.textContent())!.match(/\d+/)![0]);
    await page.getByTestId('threshold-targetMarginPct').fill('35');
    await expect(fired).not.toHaveText(`Flagged ${before} times`, { timeout: 15_000 });
    const after = Number((await fired.textContent())!.match(/\d+/)![0]);
    expect(after).toBeGreaterThan(before);
    await page.getByRole('button', { name: 'Reset all to defaults' }).click();
    await expect(fired).toHaveText(`Flagged ${before} times`, { timeout: 15_000 });
  });

  test('cash-flow inputs change the outlook', async ({ page }) => {
    await loadDemo(page);
    await go(page, 'cashflow');
    await expect(page.locator('tr.row-bad')).toHaveCount(1);
    await page.getByLabel(/^Cash in bank/).fill('40000');
    await expect(page.locator('tr.row-bad')).toHaveCount(0, { timeout: 15_000 });
  });

  test('print view: one-page summary then appendix, no navigation', async ({ page }) => {
    await loadDemo(page);
    await go(page, 'report');
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('nav.nav')).toBeHidden();
    await expect(page.locator('.report-tools')).toBeHidden();
    await expect(page.getByText('This is an analysis aid, not audited accounts or tax advice.').first()).toBeVisible();
    await shot(page, `${SHOTS}/15-report-print.png`);
    const pdf = await page.pdf({ format: 'A4' });
    expect(pdf.byteLength).toBeGreaterThan(10_000);
    await page.emulateMedia({ media: 'screen' });
  });

  test('exports findings as CSV and Excel', async ({ page }) => {
    await loadDemo(page);
    await go(page, 'report');
    const [csv] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download CSV' }).click()]);
    expect(csv.suggestedFilename()).toBe('findings.csv');
    const text = (await (await csv.createReadStream())?.toArray())?.map(String).join('') ?? '';
    expect(text).toContain('PRF-02');
    const [xlsx] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download Excel' }).click()]);
    expect(xlsx.suggestedFilename()).toBe('findings.xlsx');
  });
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  test('main screens fit a phone without horizontal scrolling', async ({ page }) => {
    await loadDemo(page);
    for (const path of ['health', 'profit', 'stock', 'cashflow', 'report']) {
      await go(page, path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
      await page.screenshot({ path: `${SHOTS}/phone-${path}.png` });
    }
  });
});
