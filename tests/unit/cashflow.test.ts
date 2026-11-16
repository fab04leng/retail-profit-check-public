import { describe, expect, it } from 'vitest';
import { analyzeCashflow, linearTrend } from '../../src/analysis/cashflow';
import { defaultCashflowInputs, defaultThresholds } from '../../src/rules/settings';
import type { InvoiceDoc } from '../../src/analysis/suppliers';
import type { SaleRow } from '../../src/core/types';
import { addDays } from '../../src/core/dates';

const t = defaultThresholds();

/** One sale per day of `perDay` RM, for `weeks` weeks ending Sunday 2026-11-01. */
function dailySales(weeks: number, perDay: (i: number) => number): SaleRow[] {
  const start = addDays('2026-11-01', -(weeks * 7) + 1);
  return Array.from({ length: weeks * 7 }, (_, i) => ({ row: i + 2, date: addDays(start, i), receipt: '', sku: 'A', name: 'A', category: 'C', qty: 1, unitPrice: perDay(i), discount: 0, total: perDay(i), outlet: '' }));
}

function doc(p: Partial<InvoiceDoc> & { dueDate: string; outstanding: number }): InvoiceDoc {
  return { key: p.invoiceNo ?? 'k', supplier: 'S', invoiceNo: 'I', date: '2026-10-01', total: p.outstanding, rows: [99], paid: null, paymentRows: [], ...p };
}

describe('linearTrend', () => {
  it('fits a straight line', () => {
    expect(linearTrend([1, 2, 3, 4])).toEqual({ intercept: 1, slope: 1 });
    expect(linearTrend([5])).toEqual({ intercept: 5, slope: 0 });
    expect(linearTrend([])).toEqual({ intercept: 0, slope: 0 });
  });
});

describe('analyzeCashflow', () => {
  const base = { ...defaultCashflowInputs(), openingBalance: 1000, includeRestocking: false };

  it('forecasts 8 Monday–Sunday weeks after the last complete week', () => {
    const r = analyzeCashflow(dailySales(8, () => 100), [], '2026-11-01', t, base, 0.7);
    expect(r.weeks).toHaveLength(8);
    expect(r.weeks[0]).toMatchObject({ start: '2026-11-02', end: '2026-11-08', opening: 1000, salesIn: 700 });
    expect(r.weeks[7]!.start).toBe('2026-12-21');
    expect(r.history).toHaveLength(8);
    expect(r.method.slope).toBeCloseTo(0);
  });

  it('extends a rising trend and never forecasts negative sales', () => {
    const rising = analyzeCashflow(dailySales(8, (i) => 100 + Math.floor(i / 7) * 10), [], '2026-11-01', t, base, 0.7);
    expect(rising.weeks[0]!.salesIn).toBeCloseTo(700 + 8 * 70);
    const falling = analyzeCashflow(dailySales(8, (i) => Math.max(0, 1000 - Math.floor(i / 7) * 300)), [], '2026-11-01', t, base, 0.7);
    expect(falling.weeks.every((w) => w.salesIn >= 0)).toBe(true);
  });

  it('ignores the incomplete current week when choosing history', () => {
    const sales = [...dailySales(8, () => 100), { ...dailySales(1, () => 99999)[0]!, date: '2026-11-03' }];
    const r = analyzeCashflow(sales, [], '2026-11-03', t, base, 0.7);
    // QA B05: the balance is as at the end of the last sales date, so week 1 starts the day after it.
    expect(r.balanceAsOf).toBe('2026-11-03');
    expect(r.weeks[0]!.start).toBe('2026-11-04');
    expect(r.weeks[0]!.salesIn).toBeCloseTo(700);
  });

  it('puts unpaid invoices in their due week and overdue ones in week 1', () => {
    const r = analyzeCashflow(dailySales(8, () => 100), [doc({ dueDate: '2026-11-18', outstanding: 500, rows: [5] }), doc({ dueDate: '2026-10-01', outstanding: 200, rows: [6] }), doc({ dueDate: '2027-03-01', outstanding: 999 })], '2026-11-01', t, base, 0.7);
    expect(r.weeks[0]!.supplierOut).toBe(200);
    expect(r.weeks[0]!.overdueOut).toBe(200);
    expect(r.weeks[2]!.supplierOut).toBe(500);
    expect(r.weeks[2]!.supplierRows).toEqual([5]);
    expect(r.laterSupplierOut).toBe(999);
  });

  it('places fixed monthly costs on their day of month (clamped to month length)', () => {
    const inputs = { ...base, fixedCosts: [{ id: 'r', label: 'Rent', amount: 3000, dayOfMonth: 1 }, { id: 's', label: 'Salaries', amount: 5000, dayOfMonth: 31 }] };
    const r = analyzeCashflow(dailySales(8, () => 0), [], '2026-11-01', t, inputs, 0.7);
    // Rent 1 Dec → week of 30 Nov; salaries 30 Nov (Nov has 30 days) → same week; 31 Dec is after the window.
    expect(r.weeks[4]!.fixedOut).toBe(8000);
    expect(r.weeks[4]!.fixedItems.map((f) => f.date)).toEqual(['2026-11-30', '2026-12-01']);
    expect(r.weeks.reduce((a, w) => a + w.fixedOut, 0)).toBe(8000);
  });

  it('estimates restocking from the cost ratio after the default supplier terms', () => {
    const r = analyzeCashflow(dailySales(8, () => 100), [], '2026-11-01', t, { ...base, includeRestocking: true }, 0.7);
    // 30-day terms ≈ 4 weeks: week 5 pays for week 1's estimated sales.
    expect(r.weeks.slice(0, 4).every((w) => w.restockOut === 0)).toBe(true);
    expect(r.weeks[4]!.restockOut).toBeCloseTo(490);
  });

  it('flags weeks where the closing balance falls below the minimum (CSH-02) as estimates', () => {
    const r = analyzeCashflow(dailySales(8, () => 100), [doc({ dueDate: '2026-11-18', outstanding: 3500, rows: [5] })], '2026-11-01', t, base, 0.7);
    const f = r.findings;
    expect(f.map((x) => x.id)).toEqual(['CSH-02:2026-11-16']);
    expect(f[0]).toMatchObject({ estimate: true, amountKind: 'shortfall' });
    expect(f[0]!.amount).toBeCloseTo(3500 - 1000 - 2100);
    expect(f[0]!.evidence).toEqual([{ file: 'invoices', rows: [5] }]);
    expect(r.lowest).toMatchObject({ start: '2026-11-16' });
  });

  it('works with no sales at all', () => {
    const r = analyzeCashflow([], [], undefined, t, base, null);
    expect(r.weeks).toEqual([]);
    expect(r.findings).toEqual([]);
  });
});
