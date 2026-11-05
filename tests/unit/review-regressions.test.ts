/** Regression tests for issues found in the Phase 3 code and security reviews. */
import { beforeEach, describe, expect, it } from 'vitest';
import { analyzeCashflow } from '../../src/analysis/cashflow';
import { analyzeProfit } from '../../src/analysis/profit';
import { analyzeStock } from '../../src/analysis/stock';
import { analyzeSuppliers, referenceContains } from '../../src/analysis/suppliers';
import { safeCell } from '../../src/core/exportCsv';
import { autoMap } from '../../src/core/mapping';
import { normalizeTable } from '../../src/core/normalize';
import { parseNumber } from '../../src/core/numbers';
import { declaredUnzippedSize, decodeText } from '../../src/core/read';
import type { SaleRow, Table } from '../../src/core/types';
import { defaultCashflowInputs, defaultThresholds } from '../../src/rules/settings';
import { invoice, payment, product, resetRows, sale } from '../helpers/fixtures';
import writeXlsxFile from 'write-excel-file/node';

const t = defaultThresholds();
beforeEach(resetRows);

describe('security: slow regex and long cells', () => {
  it('parseNumber returns quickly on a long crafted string', () => {
    const start = performance.now();
    expect(parseNumber(`1${' '.repeat(200_000)}x`)).toBeNull();
    expect(performance.now() - start).toBeLessThan(50);
  });
  it('CSV guard catches formulas behind leading whitespace', () => {
    expect(safeCell('  =1+1').replace(/^"/, '').startsWith("'")).toBe(true);
    expect(safeCell('\n=1+1').replace(/^"/, '').startsWith("'")).toBe(true);
  });
  it('reads the declared unzipped size of an xlsx', async () => {
    const buf = await writeXlsxFile([[{ value: 'a' }]]).toBuffer();
    const size = declaredUnzippedSize(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    expect(size).toBeGreaterThan(100);
    expect(declaredUnzippedSize(new ArrayBuffer(10))).toBeNull();
  });
  it('decodes UTF-16 "Unicode Text" exports', () => {
    const bytes = new Uint8Array([0xff, 0xfe, 0x41, 0x00, 0x2c, 0x00, 0x42, 0x00]);
    expect(decodeText(bytes.buffer)).toBe('A,B');
  });
});

describe('parsing fixes', () => {
  it('reads "-RM 5.00" and "RM (5.00)"', () => {
    expect(parseNumber('-RM 5.00')).toBe(-5);
    expect(parseNumber('RM (5.00)')).toBe(-5);
  });
  it('does not turn a negative-price line (discount/rounding) into a refund', () => {
    const table: Table = [['Date', 'SKU', 'Qty', 'Unit Price', 'Total'], ['15/02/2026', 'DISC', '1', '-0.50', '-0.50']];
    const res = normalizeTable('sales', table, autoMap('sales', table[0]!), 0);
    expect((res.rows[0] as SaleRow).qty).toBe(1);
    expect(res.issues[0]).toMatchObject({ code: 'negativePrice', level: 'warning' });
  });
  it('skips "Total" footer rows silently', () => {
    const table: Table = [['Date', 'SKU', 'Qty', 'Total'], ['15/02/2026', 'A', '1', '5'], ['Total', '', '1', '5'], ['', 'Jumlah', '', '5']];
    const res = normalizeTable('sales', table, autoMap('sales', table[0]!), 0);
    expect(res.rows).toHaveLength(1);
    expect(res.issues).toEqual([]);
  });
  it('merges duplicate SKUs that differ only by spaces', () => {
    const table: Table = [['SKU', 'Unit Cost', 'Qty On Hand'], ['AB 1', '2', '1'], ['AB1', '2', '1']];
    expect(normalizeTable('products', table, autoMap('products', table[0]!), 0).rows).toHaveLength(1);
  });
  it('warns about zero unit cost and treats it as no cost', () => {
    const table: Table = [['SKU', 'Unit Cost', 'Qty On Hand'], ['A', '0', '1']];
    const res = normalizeTable('products', table, autoMap('products', table[0]!), 0);
    expect(res.issues[0]).toMatchObject({ code: 'zeroCost', level: 'warning' });
    const r = analyzeProfit([sale({ sku: 'A', date: '2026-01-01', qty: 1, total: 10 })], [product({ sku: 'A', unitCost: 0, qtyOnHand: 1 })], t);
    expect(r.products[0]!.cogs).toBeNull();
    expect(r.totals.marginPct).toBeNull();
    expect(r.totals.revenueWithoutCost).toBe(10);
  });
});

describe('supplier fixes', () => {
  it('two genuinely identical lines on one invoice are not a duplicate and the total is not halved', () => {
    const l1 = invoice({ supplier: 'S', invoiceNo: 'INV9', date: '2026-01-01', sku: 'A', qty: 10, unitPrice: 5, total: 50 });
    const l2 = invoice({ supplier: 'S', invoiceNo: 'INV9', date: '2026-01-01', sku: 'A', qty: 10, unitPrice: 5, total: 50 });
    const r = analyzeSuppliers([l1, l2], [payment({ supplier: 'S', date: '2026-01-10', amount: 100, reference: 'INV9' })], true, t);
    expect(r.findings).toEqual([]);
    expect(r.invoices[0]!.total).toBe(100);
  });
  it('splits one payment that references several invoices', () => {
    const a = invoice({ supplier: 'S', invoiceNo: 'INV001', date: '2026-01-01', total: 100 });
    const b = invoice({ supplier: 'S', invoiceNo: 'INV002', date: '2026-01-02', total: 120, description: 'Other item' });
    const r = analyzeSuppliers([a, b], [payment({ supplier: 'S', date: '2026-01-20', amount: 220, reference: 'INV001, INV002' })], true, t);
    expect(r.findings).toEqual([]);
    expect(r.invoices.map((i) => i.outstanding)).toEqual([0, 0]);
  });
  it('still flags an overpayment across several referenced invoices', () => {
    const a = invoice({ supplier: 'S', invoiceNo: 'INV001', date: '2026-01-01', total: 100 });
    const b = invoice({ supplier: 'S', invoiceNo: 'INV002', date: '2026-01-02', total: 120, description: 'Other item' });
    const r = analyzeSuppliers([a, b], [payment({ supplier: 'S', date: '2026-01-20', amount: 270, reference: 'INV001/INV002' })], true, t);
    expect(r.findings.map((f) => [f.ruleId, f.amount])).toEqual([['SUP-04', 50]]);
  });
  it('finds a valid later occurrence of an invoice number in the reference', () => {
    expect(referenceContains('X1023Y123', '123')).toBe(true);
    expect(referenceContains('INV1023', '102')).toBe(false);
  });
  it('does not report a price rise for lines that only have a total', () => {
    const table: Table = [['Supplier', 'Invoice No', 'Date', 'Description', 'Total'], ['S', '1', '01/01/2026', 'Rice', '100'], ['S', '2', '01/02/2026', 'Rice', '300']];
    const lines = normalizeTable('invoices', table, autoMap('invoices', table[0]!), 0).rows;
    expect(analyzeSuppliers(lines as never, [], false, t).findings).toEqual([]);
  });
});

describe('stock and cash-flow fixes', () => {
  it('days of cover uses the days actually covered when the file is short', () => {
    const sales = Array.from({ length: 10 }, (_, i) => sale({ sku: 'A', date: `2026-06-${String(21 + i).padStart(2, '0')}`, qty: 1, total: 1 }));
    const r = analyzeStock(sales, [product({ sku: 'A', unitCost: 1, qtyOnHand: 300 })], t);
    expect(r.items[0]!.coverDays).toBe(300);
  });
  it('without a payments file, past-due invoices are assumed paid in the outlook', () => {
    const sales = Array.from({ length: 28 }, (_, i) => sale({ sku: 'A', date: `2026-02-${String(1 + i).padStart(2, '0')}`, qty: 1, total: 100 }));
    const s = analyzeSuppliers([invoice({ supplier: 'S', invoiceNo: 'OLD', date: '2025-06-01', total: 5000 })], [], false, t);
    const r = analyzeCashflow(sales, s.invoices, '2026-02-28', t, { ...defaultCashflowInputs(), includeRestocking: false }, 0.7, false);
    expect(r.weeks[0]!.supplierOut).toBe(0);
    expect(r.findings).toEqual([]);
    expect(r.method.assumedPaidBeforeStart).toBe(true);
  });
  it('drops a partial first week and reports when history is too short', () => {
    const two = [sale({ sku: 'A', date: '2026-02-27', qty: 1, total: 100 }), sale({ sku: 'A', date: '2026-02-28', qty: 1, total: 100 })];
    const r = analyzeCashflow(two, [], '2026-03-01', t, defaultCashflowInputs(), 0.7);
    expect(r.insufficientHistory).toBe(true);
    expect(r.weeks).toEqual([]);
  });
  it('counts receipts per day (receipt numbers that restart daily)', () => {
    const r = analyzeProfit([sale({ sku: 'A', date: '2026-01-01', qty: 1, total: 10, receipt: '1' }), sale({ sku: 'A', date: '2026-01-02', qty: 1, total: 10, receipt: '1' })], [product({ sku: 'A', unitCost: 5, qtyOnHand: 1 })], t);
    expect(r.outlets[0]!.receipts).toBe(2);
  });
});
