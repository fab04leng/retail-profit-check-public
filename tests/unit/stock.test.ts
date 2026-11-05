import { beforeEach, describe, expect, it } from 'vitest';
import { analyzeStock } from '../../src/analysis/stock';
import { defaultThresholds } from '../../src/rules/settings';
import { product, resetRows, sale } from '../helpers/fixtures';

const t = defaultThresholds();
beforeEach(resetRows);
const asOf = '2026-06-30';

describe('analyzeStock', () => {
  it('handles empty inputs', () => {
    const r = analyzeStock([], [], t);
    expect(r.items).toEqual([]);
    expect(r.totalValue).toBe(0);
    expect(r.findings).toEqual([]);
    expect(r.buckets.map((b) => b.value)).toEqual([0, 0, 0, 0, 0]);
  });

  it('ages stock from the last sale and buckets value 0–30/31–60/61–90/91–180/180+', () => {
    const products = [
      product({ sku: 'A', unitCost: 2, qtyOnHand: 10 }), // sold 30 days ago → 0–30
      product({ sku: 'B', unitCost: 1, qtyOnHand: 10 }), // 31 → 31–60
      product({ sku: 'C', unitCost: 1, qtyOnHand: 10 }), // 90 → 61–90
      product({ sku: 'D', unitCost: 1, qtyOnHand: 10 }), // 91 → 91–180, dead
      product({ sku: 'E', unitCost: 1, qtyOnHand: 10 }), // 181 → 180+, dead
    ];
    const sales = [
      sale({ sku: 'A', date: '2026-05-31', qty: 1, total: 5 }),
      sale({ sku: 'B', date: '2026-05-30', qty: 1, total: 5 }),
      sale({ sku: 'C', date: '2026-04-01', qty: 1, total: 5 }),
      sale({ sku: 'D', date: '2026-03-31', qty: 1, total: 5 }),
      sale({ sku: 'E', date: '2025-12-31', qty: 1, total: 5 }),
      sale({ sku: 'Z', date: asOf, qty: 1, total: 5 }),
    ];
    const r = analyzeStock(sales, products, t);
    expect(r.asOf).toBe(asOf);
    expect(r.items.map((i) => [i.sku, i.ageDays, i.bucket])).toEqual(
      expect.arrayContaining([
        ['A', 30, '0-30'],
        ['B', 31, '31-60'],
        ['C', 90, '61-90'],
        ['D', 91, '91-180'],
        ['E', 181, '180+'],
      ]),
    );
    expect(r.buckets.map((b) => b.value)).toEqual([20, 10, 10, 10, 10]);
    expect(r.totalValue).toBe(60);
    expect(r.findings.map((f) => f.id).sort()).toEqual(['STK-02:D', 'STK-02:E', 'STK-03:C']);
    // headline slow value reconciles with its findings
    expect(r.findings.reduce((a, f) => a + (f.amount ?? 0), 0)).toBe(r.slowValue);
    expect(r.deadValue).toBe(20);
    // slow = no sale for more than 60 days → C, D, E
    expect(r.slowValue).toBe(30);
    expect(r.slowCount).toBe(3);
  });

  it('dead stock finding shows stock value, product row and last sale row', () => {
    const p = product({ sku: 'D', unitCost: 2.5, qtyOnHand: 4, name: 'Kuih Bangkit' });
    const s = sale({ sku: 'D', date: '2026-01-10', qty: 1, total: 5 });
    const r = analyzeStock([s, sale({ sku: 'Z', date: asOf, qty: 1, total: 1 })], [p], t);
    expect(r.findings[0]).toMatchObject({ ruleId: 'STK-02', amount: 10, amountKind: 'stockValue', subject: 'Kuih Bangkit', params: expect.objectContaining({ days: 171 }) });
    expect(r.findings[0]!.evidence).toEqual([
      { file: 'products', rows: [p.row] },
      { file: 'sales', rows: [s.row] },
    ]);
  });

  it('does not flag items with zero or negative stock, and values negative stock at zero', () => {
    const products = [product({ sku: 'A', unitCost: 2, qtyOnHand: 0 }), product({ sku: 'B', unitCost: 2, qtyOnHand: -5 })];
    const r = analyzeStock([sale({ sku: 'Z', date: asOf, qty: 1, total: 1 })], products, t);
    expect(r.findings).toEqual([]);
    expect(r.totalValue).toBe(0);
  });

  it('never-sold items age from last received date, else from the first sales date', () => {
    const products = [product({ sku: 'N1', unitCost: 1, qtyOnHand: 5, lastReceived: '2026-06-20' }), product({ sku: 'N2', unitCost: 1, qtyOnHand: 5 })];
    const sales = [sale({ sku: 'Z', date: '2026-01-01', qty: 1, total: 1 }), sale({ sku: 'Z', date: asOf, qty: 1, total: 1 })];
    const r = analyzeStock(sales, products, t);
    const n1 = r.items.find((i) => i.sku === 'N1')!;
    const n2 = r.items.find((i) => i.sku === 'N2')!;
    expect([n1.ageDays, n1.ageBasis]).toEqual([10, 'lastReceived']);
    expect([n2.ageDays, n2.ageBasis]).toEqual([180, 'periodStart']);
    expect(r.findings.map((f) => f.id)).toEqual(['STK-02:N2']);
  });

  it('ignores refunds when finding the last sale date', () => {
    const products = [product({ sku: 'A', unitCost: 1, qtyOnHand: 5 })];
    const sales = [sale({ sku: 'A', date: '2026-01-01', qty: 1, total: 1 }), sale({ sku: 'A', date: '2026-06-29', qty: -1, total: -1 }), sale({ sku: 'Z', date: asOf, qty: 1, total: 1 })];
    expect(analyzeStock(sales, products, t).items.find((i) => i.sku === 'A')!.lastSale).toBe('2026-01-01');
  });

  it('computes days of stock cover from the look-back period', () => {
    const products = [product({ sku: 'A', unitCost: 1, qtyOnHand: 30 }), product({ sku: 'B', unitCost: 1, qtyOnHand: 30 })];
    const sales = [sale({ sku: 'A', date: '2026-06-01', qty: 90, total: 90 }), sale({ sku: 'A', date: '2026-01-01', qty: 1000, total: 1000 }), sale({ sku: 'B', date: '2026-02-01', qty: 5, total: 5 }), sale({ sku: 'Z', date: asOf, qty: 1, total: 1 })];
    const r = analyzeStock(sales, products, t);
    expect(r.items.find((i) => i.sku === 'A')!.coverDays).toBe(30); // 90 units in 90 days → 1/day
    expect(r.items.find((i) => i.sku === 'B')!.coverDays).toBeNull(); // no recent sales
  });

  it('respects an edited dead-stock threshold', () => {
    const products = [product({ sku: 'A', unitCost: 1, qtyOnHand: 5 })];
    const sales = [sale({ sku: 'A', date: '2026-05-01', qty: 1, total: 1 }), sale({ sku: 'Z', date: asOf, qty: 1, total: 1 })];
    expect(analyzeStock(sales, products, t).findings).toEqual([]);
    expect(analyzeStock(sales, products, { ...t, deadStockDays: 30 }).findings).toHaveLength(1);
  });
});
