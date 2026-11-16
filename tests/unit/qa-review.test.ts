/**
 * Regression tests for the external QA review of 13 Nov 2026 (bugs B01–B13).
 * Each case started as a probe in the QA reproduction kit that asserted the faulty behaviour;
 * the assertions here check the corrected behaviour instead.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { analyzeCashflow } from '../../src/analysis/cashflow';
import { analyzeProfit } from '../../src/analysis/profit';
import { analyzeSuppliers, referenceTokenMatches } from '../../src/analysis/suppliers';
import { duplicateCopiesTotal } from '../../src/analysis/summary';
import { findingFingerprint } from '../../src/analysis/types';
import { normalizeTable } from '../../src/core/normalize';
import { DICTS } from '../../src/i18n';
import { RULES } from '../../src/rules/rules.config';
import { defaultSettings } from '../../src/rules/settings';
import { currentReviews, datasetKey, makeReview, sanitizeReviews } from '../../src/ui/reviewBinding';
import { EngineCore } from '../../src/worker/core';
import { invoice, payment, product, resetRows, sale } from '../helpers/fixtures';

const settings = defaultSettings();
const t = settings.thresholds;
const csv = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;

beforeEach(() => resetRows());

describe('B01 — a review only applies to the data and finding it was made on', () => {
  async function analyseTiny(salesCsv: string) {
    const e = new EngineCore();
    const sales = await e.stageFile('sales', 'sales.csv', csv(salesCsv));
    const products = await e.stageFile('products', 'stock.csv', csv('SKU,Name,Unit Cost,Qty On Hand\nA,Test product,10,1\n'));
    const p = await e.analyse(settings);
    return { key: datasetKey({ sales, products }), findings: p.result.findings };
  }

  it('changing a file (same name, headers and row count) gives a different review key', async () => {
    const before = await analyseTiny('Date,SKU,Qty,Total\n2026-11-01,A,1,4\n');
    const after = await analyseTiny('Date,SKU,Qty,Total\n2026-11-01,A,1,1\n');
    const again = await analyseTiny('Date,SKU,Qty,Total\n2026-11-01,A,1,4\n');
    expect(after.key).not.toBe(before.key);
    expect(again.key).toBe(before.key); // the exact same file keeps its reviews
  });

  it('a confirmation made on the RM6 finding does not carry over to the RM9 finding', async () => {
    const before = await analyseTiny('Date,SKU,Qty,Total\n2026-11-01,A,1,4\n');
    const after = await analyseTiny('Date,SKU,Qty,Total\n2026-11-01,A,1,1\n');
    const f6 = before.findings.find((f) => f.ruleId === 'PRF-02')!;
    const f9 = after.findings.find((f) => f.ruleId === 'PRF-02')!;
    expect([f6.amount, f9.amount]).toEqual([6, 9]);
    expect(f6.id).toBe(f9.id); // same id — which is why the old key/id alone was not enough
    const saved = { [f6.id]: makeReview(f6, 'confirmed', undefined, 'checked', '2026-11-13') };
    expect(currentReviews(saved, before.findings)[f6.id]?.status).toBe('confirmed');
    expect(currentReviews(saved, after.findings)[f9.id]).toBeUndefined();
  });

  it('the fingerprint covers amount, values and evidence rows', () => {
    const f = analyzeProfit([sale({ sku: 'A', date: '2026-11-01', qty: 1, total: 4 })], [product({ sku: 'A', unitCost: 10, qtyOnHand: 1 })], t).findings[0]!;
    expect(findingFingerprint({ ...f })).toBe(findingFingerprint(f));
    expect(findingFingerprint({ ...f, amount: 7 })).not.toBe(findingFingerprint(f));
    expect(findingFingerprint({ ...f, evidence: [{ file: 'sales', rows: [99] }] })).not.toBe(findingFingerprint(f));
  });

  it('older saved reviews without a fingerprint are not applied, and notes from an older version are not reused', () => {
    expect(sanitizeReviews({ 'PRF-02:A': { status: 'confirmed', note: 'x', at: '2026-11-01' } })).toEqual({});
    const f = analyzeProfit([sale({ sku: 'A', date: '2026-11-01', qty: 1, total: 4 })], [product({ sku: 'A', unitCost: 10, qtyOnHand: 1 })], t).findings[0]!;
    const old = { ...makeReview(f, 'confirmed', undefined, 'old note', '2026-11-01'), fp: 'stale' };
    expect(makeReview(f, 'needs_info', old, undefined, '2026-11-13').note).toBe('');
  });
});

describe('B03 — payment references that list several invoice numbers', () => {
  it('"INV001, INV001A" pays RM100 to each invoice; no false overpayment or balance', () => {
    const r = analyzeSuppliers(
      ['INV001', 'INV001A'].map((invoiceNo) => invoice({ supplier: 'Demo Supplier', invoiceNo, date: '2026-10-01', total: 100 })),
      [payment({ supplier: 'Demo Supplier', date: '2026-10-02', amount: 200, reference: 'INV001, INV001A' })],
      true,
      t,
    );
    expect(r.invoices.map((i) => [i.invoiceNo, i.paid, i.outstanding])).toEqual([
      ['INV001', 100, 0],
      ['INV001A', 100, 0],
    ]);
    // No false overpayment / unmatched payment. (Two same-amount invoices on one day still
    // raise SUP-02 by design — that is a separate, correct "possible duplicate" check.)
    expect(r.findings.filter((f) => f.ruleId === 'SUP-04' || f.ruleId === 'SUP-05')).toEqual([]);
  });

  it('token matching keeps separators but still joins split numbers like "INV-0012"', () => {
    expect(referenceTokenMatches('INV001, INV001A', ['INV001', 'INV001A'])).toEqual([0, 1]);
    expect(referenceTokenMatches('Payment INV 0012', ['INV0012'])).toEqual([0]);
    expect(referenceTokenMatches('INV0012', ['INV001'])).toEqual([]); // no partial-token match
  });
});

describe('B04 — free or fully discounted sales of a costed product', () => {
  it('a RM0 sale of a RM5 product is flagged as RM5 below cost', () => {
    const r = analyzeProfit([sale({ sku: 'FREE', date: '2026-11-01', qty: 1, total: 0 })], [product({ sku: 'FREE', unitCost: 5, qtyOnHand: 10 })], t);
    expect(r.totals.grossProfit).toBe(-5);
    expect(r.findings.map((f) => [f.ruleId, f.amount])).toEqual([['PRF-02', 5]]);
  });

  it('no margin-below-target finding without revenue (a margin % does not exist)', () => {
    const r = analyzeProfit([sale({ sku: 'FREE', date: '2026-11-01', qty: 1, total: 0 })], [product({ sku: 'FREE', unitCost: 5, qtyOnHand: 10 })], t);
    expect(r.findings.some((f) => f.ruleId === 'PRF-03')).toBe(false);
  });
});

describe('B05 — the cash-in-bank figure has a date; elapsed days are not added again', () => {
  const history = () => Array.from({ length: 17 }, (_, i) => sale({ sku: 'A', date: new Date(Date.UTC(2026, 9, 19 + i)).toISOString().slice(0, 10), qty: 1, total: 100 }));
  const inputs = { openingBalance: 1000, fixedCosts: [], includeRestocking: false };

  it('a file ending on Wednesday 4 Nov starts the outlook on Thursday 5 Nov', () => {
    const r = analyzeCashflow(history(), [], '2026-11-04', t, inputs, 0.5);
    expect(r.balanceAsOf).toBe('2026-11-04');
    expect(r.weeks[0]!.start).toBe('2026-11-05');
    // Seven future days at RM100/day — none of Mon–Wed 2–4 Nov, which are already in the balance.
    expect(r.weeks[0]!.salesIn).toBeCloseTo(700);
    expect(r.weeks[0]!.closing).toBeCloseTo(1700);
  });

  it('a fixed cost on a day already in the file is not charged in week 1', () => {
    const r = analyzeCashflow(history(), [], '2026-11-04', t, { ...inputs, fixedCosts: [{ id: 'r', label: 'Rent', amount: 500, dayOfMonth: 3 }] }, 0.5);
    expect(r.weeks[0]!.fixedOut).toBe(0);
    expect(r.weeks.find((w) => w.fixedOut === 500)?.fixedItems[0]?.date).toBe('2026-12-03');
  });

  it('files ending on a Sunday are unchanged (Monday–Sunday weeks)', () => {
    const r = analyzeCashflow(history(), [], '2026-11-01', t, inputs, 0.5);
    expect(r.weeks[0]!.start).toBe('2026-11-02');
  });
});

describe('B06 — overlapping same-amount duplicates are counted once per extra copy', () => {
  it('three RM100 invoices on one day: three pairs to review, RM200 of possible extra copies', () => {
    const r = analyzeSuppliers(['I100', 'I101', 'I102'].map((invoiceNo) => invoice({ supplier: 'Demo Supplier', invoiceNo, date: '2026-11-01', total: 100 })), [], false, t);
    const pairs = r.findings.filter((f) => f.ruleId === 'SUP-02');
    expect(pairs).toHaveLength(3);
    expect(duplicateCopiesTotal(r.findings)).toBe(200);
  });
});

describe('B07 — every rule that raises findings has a message in every language', () => {
  it('no finding shows a raw "findingText.…" key', () => {
    const flagRules = RULES.filter((r) => r.kind === 'flag').map((r) => r.id);
    for (const lang of ['en', 'zh', 'ms'] as const) {
      const texts = DICTS[lang].findingText as Record<string, string>;
      for (const id of flagRules) expect(texts[id], `${lang} findingText.${id}`).toBeTruthy();
    }
  });
});

describe('B09 — a real record named "Total" is kept; footers are still skipped', () => {
  it('keeps SKU "Total" with a cost and quantity', () => {
    const r = normalizeTable('products', [['SKU', 'Name', 'Unit Cost', 'Qty On Hand'], ['Total', 'Total', '5', '10']], { sku: 0, name: 1, unitCost: 2, qtyOnHand: 3 }, 0);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({ sku: 'Total', unitCost: 5, qtyOnHand: 10 });
  });

  it('still skips a stock-balance footer ("Total" + numbers only)', () => {
    const r = normalizeTable('products', [['SKU', 'Name', 'Unit Cost', 'Qty On Hand'], ['A', 'Apple', '5', '10'], ['Total', '', '', '10']], { sku: 0, name: 1, unitCost: 2, qtyOnHand: 3 }, 0);
    expect(r.rows.map((x) => x.sku)).toEqual(['A']);
    expect(r.issues).toEqual([]);
  });
});

describe('B10 — a one-line invoice keyed in twice on the same date', () => {
  it('is flagged as a possible duplicate; the total is left as entered', () => {
    const r = analyzeSuppliers(
      [2, 3].map((row) => invoice({ row, supplier: 'Demo Supplier', invoiceNo: 'I100', date: '2026-11-01', total: 100, description: 'Single item', sku: 'A' })),
      [],
      false,
      t,
    );
    expect(r.invoices.map((i) => i.total)).toEqual([200]);
    expect(r.findings.map((f) => [f.ruleId, f.amount, f.params.copies])).toEqual([['SUP-01', 100, 2]]);
  });
});

describe('B11 — headline wording follows the dead-stock threshold', () => {
  it('the slow-stock headline carries the current dead-stock days', () => {
    expect(DICTS.en.headlines.slowStock.desc).toContain('{deadDays:num}');
    expect(DICTS.zh.headlines.slowStock.desc).toContain('{deadDays:num}');
    expect(DICTS.ms.headlines.slowStock.desc).toContain('{deadDays:num}');
  });
});
