import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { go, loadDemo } from './helpers';

const PAGES = ['health', 'profit', 'stock', 'suppliers', 'outlets', 'cashflow', 'findings', 'rules', 'report'];

test('no WCAG 2.1 A/AA violations on the start page', async ({ page }) => {
  await page.goto('/');
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
});

test('no WCAG 2.1 A/AA violations on any analysis page (review mode on)', async ({ page }) => {
  await loadDemo(page);
  await page.getByTestId('review-mode').check();
  const problems: string[] = [];
  for (const p of PAGES) {
    await go(page, p);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    for (const v of r.violations) problems.push(`${p} ${v.id}: ${v.nodes.length} × ${v.nodes[0]?.target.join(' ')} — ${v.help}`);
  }
  expect(problems).toEqual([]);
});

test('core journey works with the keyboard only', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab'); // skip link
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.getByTestId('load-demo').focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(/#\/health/);
  await expect(page.locator('#page-title')).toBeFocused();
  await go(page, 'suppliers');
  const btn = page.getByRole('button', { name: 'Show source rows' }).first();
  await btn.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(btn).toBeFocused(); // focus returns to the button
});
