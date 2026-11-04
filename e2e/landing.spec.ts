import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// The marketing landing page is a separate static page (marketing/landing/), opened straight from disk.
const LANDING = pathToFileURL(resolve('marketing/landing/index.html')).href;

function visibleHeadline(page: Page) {
  // Both languages are in the HTML; only the visible span of the visible variant counts.
  return page.locator('.hero h1:visible > span:visible');
}

async function waText(page: Page) {
  const href = await page.locator('a[data-wa]').first().getAttribute('href');
  return new URL(href ?? '').searchParams.get('text') ?? '';
}

test.describe('marketing landing page', () => {
  test('defaults to pitch A in English with an attributable WhatsApp link', async ({ page }) => {
    await page.goto(`${LANDING}?lang=en`);
    await expect(visibleHeadline(page)).toHaveCount(1);
    await expect(visibleHeadline(page)).toHaveText('See your real profit, product by product.');
    const href = await page.locator('a[data-wa]').first().getAttribute('href');
    expect(href).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    expect(await waText(page)).toContain('(ref A-web)');
  });

  for (const [v, headline] of [
    ['b', 'How much of your cash is sitting on the shelf?'],
    ['c', 'Catch costly supplier invoice mistakes.'],
  ] as const) {
    test(`?v=${v} shows only that pitch`, async ({ page }) => {
      await page.goto(`${LANDING}?v=${v}&lang=en&src=fbad`);
      await expect(visibleHeadline(page)).toHaveCount(1);
      await expect(visibleHeadline(page)).toHaveText(headline);
      await expect(page.locator(`.hero-shot img[data-variant="${v}"]`)).toBeVisible();
      expect(await waText(page)).toContain(`(ref ${v.toUpperCase()}-fbad)`);
    });
  }

  test('Chinese via URL and via the toggle', async ({ page }) => {
    await page.goto(`${LANDING}?v=b&lang=zh`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans');
    await expect(visibleHeadline(page)).toHaveText('你有多少现金，正压在货架上？');
    expect(await waText(page)).toContain('你好');
    await expect(page.locator('img[data-img="health"]')).toHaveAttribute('src', 'assets/zh-health.webp');
    await page.getByRole('button', { name: 'EN' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(visibleHeadline(page)).toHaveText('How much of your cash is sitting on the shelf?');
    await expect(page.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('ignores unknown or unsafe URL parameters', async ({ page }) => {
    await page.goto(`${LANDING}?v=x&lang=fr&src=${encodeURIComponent('<script>alert(1)</script>')}`);
    await expect(page.locator('html')).toHaveAttribute('data-v', 'a');
    const text = await waText(page);
    expect(text).toContain('ref A-web');
    expect(text).not.toContain('<');
  });

  test('labels the sample numbers as demo data', async ({ page }) => {
    await page.goto(`${LANDING}?lang=en`);
    await expect(page.locator('#sample .demo-note')).toContainText('fictional');
    await expect(page.locator('#sample .demo-note')).toContainText("not a real customer's results");
  });

  test('loads nothing from the network and fits a small phone', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (r) => {
      if (!r.url().startsWith('file:')) external.push(r.url());
    });
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(`${LANDING}?v=c&lang=zh`);
    // Scroll through so lazy images load, then check every visible image decoded.
    for (let y = 0; y < 12000; y += 600) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(50);
    }
    await expect
      .poll(() =>
        page.$$eval('img', (imgs) =>
          imgs
            .filter((i) => getComputedStyle(i).display !== 'none' && (i as HTMLImageElement).naturalWidth === 0)
            .map((i) => i.getAttribute('src')),
        ),
      )
      .toEqual([]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(external).toEqual([]);
    await expect(page.locator('.sticky-cta a[data-wa]')).toBeVisible();
  });
});

test('shows the demo video in the chosen language only, without preloading', async ({ page }) => {
  await page.goto(`${LANDING}?lang=zh`);
  const videos = page.locator('#sample video:visible');
  await expect(videos).toHaveCount(1);
  await expect(videos).toHaveAttribute('poster', 'assets/demo-poster-zh.webp');
  await expect(videos).toHaveAttribute('preload', 'none');
});
