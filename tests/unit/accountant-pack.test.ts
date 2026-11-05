import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { generateDemo, type DemoData } from '../../src/demo/generate';
import { buildPack, renderHtml, renderMarkdown, rulesVersion, type EvidenceFile, type Pack } from '../../src/review';
import { compressRows } from '../../src/review/packExamples';
import { RULE_NOTES } from '../../src/review/packNotes';
import { escapeHtml, thresholdValue } from '../../src/review/packRender';
import { RULES } from '../../src/rules/rules.config';

const docs = join(__dirname, '../../docs/accountant-review');

describe('accountant review pack', () => {
  let demo: DemoData;
  let pack: Pack;
  let evidence: EvidenceFile[];
  beforeAll(() => {
    demo = generateDemo();
    ({ pack, evidence } = buildPack(demo));
  });

  it('has notes for every rule, in both languages, with matching list lengths', () => {
    for (const r of RULES) {
      const n = RULE_NOTES[r.id];
      expect(n, r.id).toBeDefined();
      expect(n.falsePositives.en.length, r.id).toBeGreaterThan(0);
      expect(n.falsePositives.zh.length, r.id).toBe(n.falsePositives.en.length);
      expect(n.mayMiss.zh.length, r.id).toBe(n.mayMiss.en.length);
      expect(n.question.en && n.question.zh, r.id).toBeTruthy();
    }
    expect(Object.keys(RULE_NOTES).sort()).toEqual(RULES.map((r) => r.id).sort());
  });

  it('has a worked example for every rule, with steps in both languages', () => {
    for (const r of RULES) {
      const ex = pack.examples[r.id];
      expect(ex.steps.en.length, r.id).toBeGreaterThan(0);
      expect(ex.steps.zh.length, r.id).toBe(ex.steps.en.length);
      expect(ex.tables.length, r.id).toBeGreaterThan(0);
    }
  });

  it('prints the exact demo rows, with the right spreadsheet row numbers', () => {
    for (const r of RULES) {
      for (const t of pack.examples[r.id].tables) {
        if (t.kind !== 'rows') continue;
        expect(t.header).toEqual(demo.tables[t.file][0]);
        for (const row of t.rows) expect(row.cells, `${r.id} ${t.file} row ${row.row}`).toEqual(demo.tables[t.file][row.row - 1]);
        if (t.allRows.length > t.rows.length) expect(evidence.some((e) => e.name === t.csvName)).toBe(true);
      }
    }
  });

  it('puts every row behind an example into its evidence CSV', () => {
    const csv = evidence.find((e) => e.name === 'CSH-02-invoices.csv')!;
    const t = pack.examples['CSH-02'].tables[0]!;
    expect(t.kind).toBe('rows');
    if (t.kind === 'rows') expect(csv.content.trim().split('\n').length).toBe(t.allRows.length + 1);
  });

  it('has a decision box for every rule and a sign-off on the cover', () => {
    const en = renderMarkdown(pack, 'en');
    const zh = renderMarkdown(pack, 'zh');
    for (const r of RULES) {
      expect(en).toContain(`## ${r.id} — ${r.title}`);
      expect(zh).toContain(`## ${r.id} — `);
    }
    expect(en.match(/- \[ \] Agree/g)?.length).toBe(RULES.length);
    expect(en.match(/- \[ \] Remove this rule/g)?.length).toBe(RULES.length);
    expect(zh.match(/- \[ \] 同意/g)?.length).toBe(RULES.length);
    expect(en).toContain('not an audit, review or other assurance engagement');
    expect(zh).toContain('并不是对任何企业财务资料的审计');
  });

  it('escapes text in the printable HTML', () => {
    expect(escapeHtml('<b>"x" & \'y\'</b>')).toBe('&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;');
    const html = renderHtml(pack, 'zh');
    expect(html).toContain('<html lang="zh-Hans">');
    expect(html).not.toMatch(/<script/i);
  });

  it('ties the pack to a rules version that changes when a threshold changes', () => {
    const changed = RULES.map((r) => (r.id === 'STK-02' ? { ...r, thresholds: r.thresholds.map((t) => ({ ...t, default: 120 })) } : r));
    expect(rulesVersion()).toMatch(/^[0-9a-f]{8}$/);
    expect(rulesVersion(changed)).not.toBe(rulesVersion());
  });

  it('formats thresholds and row ranges', () => {
    expect(thresholdValue(25, 'percent', 'en')).toBe('25%');
    expect(thresholdValue(90, 'days', 'zh')).toBe('90 天');
    expect(thresholdValue(0.5, 'rm', 'en')).toBe('RM 0.5');
    expect(compressRows([5, 3, 4, 10, 12, 11, 4])).toBe('3–5, 10–12');
  });

  it('matches the committed files in docs/accountant-review (run npm run accountant:pdf after changing rules)', () => {
    for (const lang of ['en', 'zh'] as const) {
      expect(readFileSync(join(docs, `rule-review-pack.${lang}.md`), 'utf8')).toBe(renderMarkdown(pack, lang));
      expect(readFileSync(join(docs, `rule-review-pack.${lang}.html`), 'utf8')).toBe(renderHtml(pack, lang));
    }
  });
});
