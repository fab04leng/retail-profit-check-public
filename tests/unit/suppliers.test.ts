import { beforeEach, describe, expect, it } from 'vitest';
import { analyzeSuppliers, normalizeInvoiceNo, normalizeSupplier } from '../../src/analysis/suppliers';
import { defaultThresholds } from '../../src/rules/settings';
import { invoice, payment, resetRows } from '../helpers/fixtures';

const t = defaultThresholds();
beforeEach(resetRows);

describe('normalisers', () => {
  it('normalises invoice numbers ignoring case, spaces and dashes', () => {
    expect(normalizeInvoiceNo('inv-0012')).toBe(normalizeInvoiceNo('INV 0012'));
    expect(normalizeInvoiceNo('INV/26/0012')).toBe('INV260012');
  });
  it('normalises supplier names (case, punctuation, Sdn Bhd)', () => {
    expect(normalizeSupplier('Kopisenja Beverage Agency Sdn. Bhd.')).toBe(normalizeSupplier('KOPISENJA BEVERAGE AGENCY'));
  });
});

describe('SUP-01 duplicate invoice number', () => {
  it('flags the same supplier and invoice number on different dates', () => {
    const a = invoice({ supplier: 'S', invoiceNo: 'INV-1', date: '2026-01-01', total: 500 });
    const b = invoice({ supplier: 's', invoiceNo: 'inv 1', date: '2026-01-04', total: 500 });
    const r = analyzeSuppliers([a, b], [], false, t);
    const f = r.findings.filter((x) => x.ruleId === 'SUP-01');
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ amount: 500, amountKind: 'invoiceTotal', params: expect.objectContaining({ invoiceNo: 'INV-1', copies: 2 }) });
    expect(f[0]!.evidence).toEqual([{ file: 'invoices', rows: [a.row, b.row] }]);
  });

  it('flags an invoice whose lines were all entered twice on the same date', () => {
    const lines = [
      invoice({ supplier: 'S', invoiceNo: 'X9', date: '2026-01-01', sku: 'A', qty: 2, unitPrice: 5, total: 10 }),
      invoice({ supplier: 'S', invoiceNo: 'X9', date: '2026-01-01', sku: 'B', qty: 1, unitPrice: 7, total: 7 }),
      invoice({ supplier: 'S', invoiceNo: 'X9', date: '2026-01-01', sku: 'A', qty: 2, unitPrice: 5, total: 10 }),
      invoice({ supplier: 'S', invoiceNo: 'X9', date: '2026-01-01', sku: 'B', qty: 1, unitPrice: 7, total: 7 }),
    ];
    const r = analyzeSuppliers(lines, [], false, t);
    const f = r.findings.filter((x) => x.ruleId === 'SUP-01');
    expect(f).toHaveLength(1);
    expect(f[0]!.amount).toBe(17);
    expect(r.invoices[0]!.total).toBe(17); // canonical total counts one copy
  });

  it('does not flag a normal multi-line invoice', () => {
    const lines = [invoice({ supplier: 'S', invoiceNo: 'X9', date: '2026-01-01', sku: 'A', total: 10 }), invoice({ supplier: 'S', invoiceNo: 'X9', date: '2026-01-01', sku: 'B', total: 7 })];
    expect(analyzeSuppliers(lines, [], false, t).findings).toEqual([]);
  });

  it('does not treat the same invoice number from different suppliers as a duplicate', () => {
    const r = analyzeSuppliers([invoice({ supplier: 'S1', invoiceNo: '1001', date: '2026-01-01', total: 5 }), invoice({ supplier: 'S2', invoiceNo: '1001', date: '2026-01-02', total: 6 })], [], false, t);
    expect(r.findings).toEqual([]);
  });
});

describe('SUP-02 same amount within N days', () => {
  it('flags same supplier, different number, same total within 7 days', () => {
    const a = invoice({ supplier: 'S', invoiceNo: 'A1', date: '2026-01-01', total: 1325.22 });
    const b = invoice({ supplier: 'S', invoiceNo: 'A2', date: '2026-01-08', total: 1325.22 });
    const r = analyzeSuppliers([a, b], [], false, t);
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0]).toMatchObject({ ruleId: 'SUP-02', amount: 1325.22, params: expect.objectContaining({ days: 7 }) });
    expect(r.findings[0]!.evidence[0]!.rows).toEqual([a.row, b.row]);
  });
  it('respects the window and exact-to-the-sen amount', () => {
    const r = analyzeSuppliers(
      [invoice({ supplier: 'S', invoiceNo: 'A1', date: '2026-01-01', total: 100 }), invoice({ supplier: 'S', invoiceNo: 'A2', date: '2026-01-09', total: 100 }), invoice({ supplier: 'S', invoiceNo: 'A3', date: '2026-01-10', total: 100.01 })],
      [],
      false,
      t,
    );
    expect(r.findings).toEqual([]);
    const wider = analyzeSuppliers([invoice({ supplier: 'S', invoiceNo: 'A1', date: '2026-01-01', total: 100 }), invoice({ supplier: 'S', invoiceNo: 'A2', date: '2026-01-09', total: 100 })], [], false, { ...t, duplicateWindowDays: 10 });
    expect(wider.findings).toHaveLength(1);
  });
});

describe('SUP-03 price increases', () => {
  it('flags a unit price rise above 5% versus the previous price from the same supplier', () => {
    const a = invoice({ supplier: 'S', invoiceNo: '1', date: '2026-01-01', sku: 'K1', description: 'Kopi', qty: 10, unitPrice: 10, total: 100 });
    const b = invoice({ supplier: 'S', invoiceNo: '2', date: '2026-02-01', sku: 'K1', description: 'Kopi', qty: 10, unitPrice: 10.5, total: 105 });
    const c = invoice({ supplier: 'S', invoiceNo: '3', date: '2026-03-01', sku: 'K1', description: 'Kopi', qty: 20, unitPrice: 11.6, total: 232 });
    const r = analyzeSuppliers([c, a, b], [], false, t);
    const f = r.findings.filter((x) => x.ruleId === 'SUP-03');
    expect(f).toHaveLength(1); // 5% exactly is not "more than 5%"; 10.5 → 11.6 is 10.5%
    expect(f[0]).toMatchObject({ amountKind: 'priceImpact', params: expect.objectContaining({ prevPrice: 10.5, newPrice: 11.6, item: 'Kopi' }) });
    expect(f[0]!.amount).toBeCloseTo(22);
    expect(Number(f[0]!.params.pct)).toBeCloseTo(10.48, 1);
    expect(f[0]!.evidence[0]!.rows).toEqual([b.row, c.row]);
  });
  it('falls back to the description when there is no SKU, and ignores price drops', () => {
    const r = analyzeSuppliers(
      [
        invoice({ supplier: 'S', invoiceNo: '1', date: '2026-01-01', description: 'Gula 1kg', qty: 1, unitPrice: 3, total: 3 }),
        invoice({ supplier: 'S', invoiceNo: '2', date: '2026-01-05', description: 'gula  1KG', qty: 1, unitPrice: 2, total: 2 }),
        invoice({ supplier: 'S', invoiceNo: '3', date: '2026-01-09', description: 'Gula 1kg', qty: 1, unitPrice: 3, total: 3 }),
      ],
      [],
      false,
      t,
    );
    expect(r.findings.map((f) => f.ruleId)).toEqual(['SUP-03']); // 2 → 3 is +50%
  });
  it('does not compare prices across different suppliers', () => {
    const r = analyzeSuppliers([invoice({ supplier: 'S1', invoiceNo: '1', date: '2026-01-01', sku: 'A', unitPrice: 1, total: 1 }), invoice({ supplier: 'S2', invoiceNo: '2', date: '2026-01-02', sku: 'A', unitPrice: 2, total: 2 })], [], false, t);
    expect(r.findings).toEqual([]);
  });
});

describe('payment checks (SUP-04, SUP-05)', () => {
  it('does nothing when no payments file was provided', () => {
    const r = analyzeSuppliers([invoice({ supplier: 'S', invoiceNo: '1', date: '2026-01-01', total: 100 })], [], false, t);
    expect(r.findings).toEqual([]);
    expect(r.invoices[0]!.paid).toBeNull();
  });

  it('matches by reference and flags an invoice paid twice', () => {
    const inv = invoice({ supplier: 'S', invoiceNo: 'INV-77', date: '2026-01-01', total: 900 });
    const p1 = payment({ supplier: 'S', date: '2026-01-20', amount: 900, reference: 'INV-77' });
    const p2 = payment({ supplier: 'S', date: '2026-01-29', amount: 900, reference: 'Bayaran inv77' });
    const r = analyzeSuppliers([inv], [p1, p2], true, t);
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0]).toMatchObject({ ruleId: 'SUP-04', amount: 900, amountKind: 'overpaid', params: expect.objectContaining({ count: 2, kind: 'paidTwice' }) });
    expect(r.findings[0]!.evidence).toEqual([
      { file: 'invoices', rows: [inv.row] },
      { file: 'payments', rows: [p1.row, p2.row] },
    ]);
  });

  it('flags paying more than the invoice amount, within tolerance', () => {
    const inv = invoice({ supplier: 'S', invoiceNo: '4580', date: '2026-01-01', total: 4580 });
    const r = analyzeSuppliers([inv], [payment({ supplier: 'S', date: '2026-01-20', amount: 4850, reference: '4580' })], true, t);
    expect(r.findings[0]).toMatchObject({ ruleId: 'SUP-04', amount: 270, params: expect.objectContaining({ kind: 'overpaid' }) });
    const ok = analyzeSuppliers([inv], [payment({ supplier: 'S', date: '2026-01-20', amount: 4580.5, reference: '4580' })], true, t);
    expect(ok.findings).toEqual([]);
  });

  it('matches a payment without reference by exact amount on or after the invoice date', () => {
    const inv = invoice({ supplier: 'S', invoiceNo: 'A', date: '2026-01-01', total: 123.45 });
    const r = analyzeSuppliers([inv], [payment({ supplier: 'S', date: '2026-01-15', amount: 123.45 })], true, t);
    expect(r.findings).toEqual([]);
    expect(r.invoices[0]!.paid).toBe(123.45);
    const early = analyzeSuppliers([inv], [payment({ supplier: 'S', date: '2025-12-15', amount: 123.45 })], true, t);
    expect(early.findings.map((f) => f.ruleId)).toEqual(['SUP-05']);
  });

  it('does not reference-match a shorter number inside a longer one', () => {
    const inv = invoice({ supplier: 'S', invoiceNo: '102', date: '2026-01-01', total: 50 });
    const r = analyzeSuppliers([inv], [payment({ supplier: 'S', date: '2026-01-10', amount: 70, reference: 'INV 1023' })], true, t);
    expect(r.findings.map((f) => f.ruleId)).toEqual(['SUP-05']);
  });

  it('flags payments with no matching invoice, and ignores negative (refund) payments', () => {
    const r = analyzeSuppliers([], [payment({ supplier: 'S', date: '2026-01-10', amount: 2000, reference: 'DEPOSIT' }), payment({ supplier: 'S', date: '2026-01-11', amount: -50 })], true, t);
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0]).toMatchObject({ ruleId: 'SUP-05', amount: 2000, amountKind: 'payment' });
  });

  it('counts duplicate-number copies as one invoice for payment purposes', () => {
    const a = invoice({ supplier: 'S', invoiceNo: 'D1', date: '2026-01-01', total: 300 });
    const b = invoice({ supplier: 'S', invoiceNo: 'D1', date: '2026-01-04', total: 300 });
    const r = analyzeSuppliers([a, b], [payment({ supplier: 'S', date: '2026-01-30', amount: 300, reference: 'D1' })], true, t);
    expect(r.findings.map((f) => f.ruleId)).toEqual(['SUP-01']);
    expect(r.invoices).toHaveLength(1);
    expect(r.invoices[0]!.outstanding).toBe(0);
  });

  it('computes outstanding amounts and due dates (default terms when missing)', () => {
    const a = invoice({ supplier: 'S', invoiceNo: 'A', date: '2026-01-01', total: 100, dueDate: '2026-01-15' });
    const b = invoice({ supplier: 'S', invoiceNo: 'B', date: '2026-01-01', total: 80 });
    const r = analyzeSuppliers([a, b], [payment({ supplier: 'S', date: '2026-01-10', amount: 40, reference: 'A' })], true, t);
    expect(r.invoices.map((i) => [i.invoiceNo, i.dueDate, i.outstanding])).toEqual([
      ['A', '2026-01-15', 60],
      ['B', '2026-01-31', 80],
    ]);
  });
});
