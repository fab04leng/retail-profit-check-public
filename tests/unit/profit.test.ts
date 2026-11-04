import { beforeEach, describe, expect, it } from 'vitest';
import { analyzeProfit } from '../../src/analysis/profit';
import { defaultThresholds } from '../../src/rules/settings';
import { product, resetRows, sale } from '../helpers/fixtures';

const t = defaultThresholds();
beforeEach(resetRows);

describe('analyzeProfit', () => {
  it('returns empty results for empty inputs', () => {
    const r = analyzeProfit([], [], t);
    expect(r.products).toEqual([]);
    expect(r.categories).toEqual([]);
    expect(r.findings).toEqual([]);
    expect(r.totals).toMatchObject({ revenue: 0, cogs: 0, grossProfit: 0, marginPct: null });
  });

  it('computes revenue, COGS, gross profit and margin per product and category', () => {
    const products = [product({ sku: 'A', unitCost: 6, qtyOnHand: 1, category: 'Drinks' }), product({ sku: 'B', unitCost: 2, qtyOnHand: 1, category: 'Snacks' })];
    const sales = [sale({ sku: 'A', date: '2026-01-01', qty: 2, total: 20 }), sale({ sku: 'A', date: '2026-01-02', qty: 1, total: 10 }), sale({ sku: 'B', date: '2026-01-02', qty: 5, total: 20 })];
    const r = analyzeProfit(sales, products, t);
    const a = r.products.find((p) => p.sku === 'A')!;
    expect(a).toMatchObject({ units: 3, revenue: 30, cogs: 18, grossProfit: 12, marginPct: 40 });
    expect(a.saleRows).toEqual([sales[0]!.row, sales[1]!.row]);
    expect(r.categories.map((c) => [c.category, c.revenue, c.grossProfit])).toEqual([
      ['Drinks', 30, 12],
      ['Snacks', 20, 10],
    ]);
    expect(r.totals).toMatchObject({ revenue: 50, cogs: 28, grossProfit: 22, marginPct: 44 });
  });

  it('ranks best and worst by gross profit', () => {
    const products = ['A', 'B', 'C'].map((sku, i) => product({ sku, unitCost: i + 1, qtyOnHand: 0 }));
    const sales = [sale({ sku: 'A', date: '2026-01-01', qty: 1, total: 10 }), sale({ sku: 'B', date: '2026-01-01', qty: 1, total: 3 }), sale({ sku: 'C', date: '2026-01-01', qty: 1, total: 30 })];
    const r = analyzeProfit(sales, products, t);
    expect(r.products.map((p) => p.sku)).toEqual(['C', 'A', 'B']);
  });

  it('nets refunds (negative quantities) out of units, revenue and COGS', () => {
    const products = [product({ sku: 'A', unitCost: 5, qtyOnHand: 1 })];
    const sales = [sale({ sku: 'A', date: '2026-01-01', qty: 3, total: 30 }), sale({ sku: 'A', date: '2026-01-03', qty: -1, total: -10 })];
    const r = analyzeProfit(sales, products, t);
    expect(r.products[0]).toMatchObject({ units: 2, revenue: 20, cogs: 10, grossProfit: 10 });
  });

  it('flags products sold below cost with the RM amount below cost (PRF-02)', () => {
    const products = [product({ sku: 'A', unitCost: 10, qtyOnHand: 1, name: 'Kopi 1kg' })];
    const sales = [sale({ sku: 'A', date: '2026-01-01', qty: 4, total: 36 })];
    const r = analyzeProfit(sales, products, t);
    expect(r.findings).toHaveLength(1);
    const f = r.findings[0]!;
    expect(f).toMatchObject({ ruleId: 'PRF-02', id: 'PRF-02:A', amount: 4, amountKind: 'belowCost', subject: 'Kopi 1kg' });
    expect(f.evidence).toEqual([
      { file: 'sales', rows: [sales[0]!.row] },
      { file: 'products', rows: [products[0]!.row] },
    ]);
    expect(f.estimate).toBeFalsy();
  });

  it('flags margins below the editable target but not below-cost products twice (PRF-03)', () => {
    const products = [product({ sku: 'A', unitCost: 8, qtyOnHand: 1 }), product({ sku: 'B', unitCost: 7, qtyOnHand: 1 }), product({ sku: 'C', unitCost: 12, qtyOnHand: 1 })];
    const sales = [sale({ sku: 'A', date: '2026-01-01', qty: 1, total: 10 }), sale({ sku: 'B', date: '2026-01-01', qty: 1, total: 10 }), sale({ sku: 'C', date: '2026-01-01', qty: 1, total: 10 })];
    const r = analyzeProfit(sales, products, t);
    expect(r.findings.map((f) => f.id).sort()).toEqual(['PRF-02:C', 'PRF-03:A']);
    const low = r.findings.find((f) => f.id === 'PRF-03:A')!;
    expect(low.amount).toBeCloseTo(0.5); // needs RM2.50 profit for 25%, has RM2.00
    expect(low.amountKind).toBe('marginGap');
    const r2 = analyzeProfit(sales, products, { ...t, targetMarginPct: 35 });
    expect(r2.findings.map((f) => f.id).sort()).toEqual(['PRF-02:C', 'PRF-03:A', 'PRF-03:B']);
  });

  it('reports sales of SKUs missing from the product list instead of guessing their cost', () => {
    const sales = [sale({ sku: 'X', date: '2026-01-01', qty: 1, total: 10 }), sale({ sku: 'x', date: '2026-01-02', qty: 1, total: 5 })];
    const r = analyzeProfit(sales, [], t);
    expect(r.products[0]).toMatchObject({ sku: 'X', revenue: 15, cogs: null, marginPct: null });
    expect(r.unknownSkus).toEqual([{ sku: 'X', name: 'X', revenue: 15, rows: [sales[0]!.row, sales[1]!.row] }]);
    expect(r.totals.revenueWithoutCost).toBe(15);
    expect(r.findings).toEqual([]);
  });

  it('matches SKUs case- and space-insensitively', () => {
    const r = analyzeProfit([sale({ sku: ' a-1 ', date: '2026-01-01', qty: 1, total: 10 })], [product({ sku: 'A-1', unitCost: 5, qtyOnHand: 0 })], t);
    expect(r.products[0]!.cogs).toBe(5);
  });

  it('skips products whose net sales are zero or negative from margin flags', () => {
    const products = [product({ sku: 'A', unitCost: 5, qtyOnHand: 1 })];
    const sales = [sale({ sku: 'A', date: '2026-01-01', qty: 1, total: 2 }), sale({ sku: 'A', date: '2026-01-01', qty: -1, total: -2 })];
    expect(analyzeProfit(sales, products, t).findings).toEqual([]);
  });

  it('summarises by outlet', () => {
    const products = [product({ sku: 'A', unitCost: 5, qtyOnHand: 1 })];
    const sales = [sale({ sku: 'A', date: '2026-01-01', qty: 1, total: 10, outlet: 'Jelutong', receipt: 'R1' }), sale({ sku: 'A', date: '2026-01-01', qty: 2, total: 20, outlet: 'Bayan Lepas', receipt: 'R2' })];
    const r = analyzeProfit(sales, products, t);
    expect(r.outlets.map((o) => [o.outlet, o.revenue, o.grossProfit, o.receipts])).toEqual([
      ['Bayan Lepas', 20, 10, 1],
      ['Jelutong', 10, 5, 1],
    ]);
  });
});
