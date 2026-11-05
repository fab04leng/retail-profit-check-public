/**
 * Writes the accountant rule-review pack to docs/accountant-review/:
 *   rule-review-pack.{en,zh}.md    readable on GitHub
 *   rule-review-pack.{en,zh}.html  printable (A4, one rule per page)
 *   rule-review-pack.{en,zh}.pdf   print-ready (only with --pdf; needs the Playwright browser)
 *   evidence/*.csv                 every source row behind each worked example
 * Run: npm run accountant:pack   (add -- --pdf, or use npm run accountant:pdf)
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildPack, pdfFooter, renderHtml, renderMarkdown } from '../src/review';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs/accountant-review');
const { pack, evidence } = buildPack();

rmSync(join(out, 'evidence'), { recursive: true, force: true });
mkdirSync(join(out, 'evidence'), { recursive: true });
for (const e of evidence) writeFileSync(join(out, 'evidence', e.name), e.content);
for (const lang of ['en', 'zh'] as const) {
  writeFileSync(join(out, `rule-review-pack.${lang}.md`), renderMarkdown(pack, lang));
  writeFileSync(join(out, `rule-review-pack.${lang}.html`), renderHtml(pack, lang));
}
console.log(`Rules version ${pack.rulesVersion}: wrote Markdown, HTML and ${evidence.length} evidence files to docs/accountant-review/`);

if (process.argv.includes('--pdf')) {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  try {
    for (const lang of ['en', 'zh'] as const) {
      const page = await browser.newPage();
      await page.goto(pathToFileURL(join(out, `rule-review-pack.${lang}.html`)).href);
      await page.pdf({
        path: join(out, `rule-review-pack.${lang}.pdf`),
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate: pdfFooter(pack, lang),
      });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log('Wrote rule-review-pack.en.pdf and rule-review-pack.zh.pdf');
}
