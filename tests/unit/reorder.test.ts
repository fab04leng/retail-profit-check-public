import { beforeEach, describe, expect, it } from 'vitest';
import { reorderSuggestions } from '../../src/analysis/stock';
import { analyzeStock } from '../../src/analysis/stock';
import { defaultThresholds } from '../../src/rules/settings';
import { product, resetRows, sale } from '../helpers/fixtures';

const t = defaultThresholds();
beforeEach(resetRows);

describe('reorder suggestions (STK-05)', () => {
  it('suggests topping up fast movers that are running low, to the target cover', () => {
    const products = [
      product({ sku: 'FAST', unitCost: 2, qtyOnHand: 10 }), // 90 units / 90 days = 1/day → 10 days cover
      product({ sku: 'FASTOK', unitCost: 2, qtyOnHand: 200 }), // plenty
      ...['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'].map((sku) => product({ sku, unitCost: 1, qtyOnHand: 1 })),
    ];
    const sales = [
      sale({ sku: 'Z', date: '2026-03-01', qty: 1, total: 1 }), // file covers > 90 days
      sale({ sku: 'FAST', date: '2026-06-01', qty: 90, total: 180 }),
      sale({ sku: 'FASTOK', date: '2026-06-01', qty: 90, total: 180 }),
      ...['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'].map((sku) => sale({ sku, date: '2026-06-30', qty: 1, total: 1 })),
    ];
    const stock = analyzeStock(sales, products, t);
    const r = reorderSuggestions(stock, t);
    expect(r.map((x) => x.sku)).toEqual(['FAST']);
    expect(r[0]).toMatchObject({ coverDays: 10, suggestedQty: 20, perDay: 1 });
    expect(r[0]!.value).toBe(40);
  });

  it('never suggests for slow sellers or items without recent sales', () => {
    const products = [product({ sku: 'A', unitCost: 1, qtyOnHand: 0 })];
    const stock = analyzeStock([sale({ sku: 'A', date: '2026-01-01', qty: 5, total: 5 }), sale({ sku: 'Z', date: '2026-06-30', qty: 1, total: 1 })], products, t);
    expect(reorderSuggestions(stock, t)).toEqual([]);
  });

  it('uses editable thresholds', () => {
    const products = [product({ sku: 'FAST', unitCost: 2, qtyOnHand: 10 })];
    const stock = analyzeStock([sale({ sku: 'Z', date: '2026-03-01', qty: 1, total: 1 }), sale({ sku: 'FAST', date: '2026-06-01', qty: 90, total: 180 }), sale({ sku: 'Z', date: '2026-06-30', qty: 1, total: 1 })], products, t);
    expect(reorderSuggestions(stock, { ...t, reorderBelowCoverDays: 7 })).toEqual([]);
    expect(reorderSuggestions(stock, { ...t, reorderTargetCoverDays: 60 })[0]!.suggestedQty).toBe(50);
  });
});
