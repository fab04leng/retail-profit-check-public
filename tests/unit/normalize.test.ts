import { describe, expect, it } from 'vitest';
import { autoMap } from '../../src/core/mapping';
import { normalizeTable } from '../../src/core/normalize';
import type { ProductRow, SaleRow, Table } from '../../src/core/types';

function sales(table: Table) {
  const mapping = autoMap('sales', table[0]!);
  return normalizeTable('sales', table, mapping, 0) as { rows: SaleRow[]; issues: ReturnType<typeof normalizeTable>['issues'] };
}

const SALES_HEADER = ['Date', 'Receipt No', 'SKU', 'Product Name', 'Category', 'Quantity', 'Unit Price', 'Discount', 'Total', 'Outlet'];

describe('normalize sales', () => {
  it('parses a normal row with DD/MM/YYYY dates and thousands separators', () => {
    const { rows, issues } = sales([SALES_HEADER, ['13/01/2026', 'R1', 'A1', 'Beras 10kg', 'Rice', '1', '1,250.00', '0', 'RM 1,250.00', 'Jelutong']]);
    expect(issues).toEqual([]);
    expect(rows[0]).toMatchObject({ row: 2, date: '2026-01-13', sku: 'A1', qty: 1, unitPrice: 1250, total: 1250, outlet: 'Jelutong' });
  });

  it('computes total from qty × price − discount when total is empty', () => {
    const { rows } = sales([SALES_HEADER, ['13/01/2026', 'R1', 'A1', 'X', 'C', '3', '10', '2', '', '']]);
    expect(rows[0]!.total).toBe(28);
  });

  it('reads percentage discounts', () => {
    const { rows } = sales([SALES_HEADER, ['13/01/2026', 'R1', 'A1', 'X', 'C', '2', '50', '10%', '', '']]);
    expect(rows[0]!.discount).toBe(10);
    expect(rows[0]!.total).toBe(90);
  });

  it('keeps refunds (negative quantity) as negative revenue', () => {
    const { rows } = sales([SALES_HEADER, ['13/01/2026', 'R9', 'A1', 'X', 'C', '-1', '10', '0', '-10', '']]);
    expect(rows[0]).toMatchObject({ qty: -1, total: -10 });
  });

  it('fixes refund signs when quantity and amount disagree, with a warning', () => {
    const { rows, issues } = sales([
      SALES_HEADER,
      ['13/01/2026', 'R9', 'A1', 'X', 'C', '1', '10', '0', '-10', ''],
      ['13/01/2026', 'R9', 'A1', 'X', 'C', '-2', '10', '0', '20', ''],
    ]);
    expect(rows.map((r) => [r.qty, r.total])).toEqual([[-1, -10], [-2, -20]]);
    expect(issues.filter((i) => i.code === 'signFixed')).toHaveLength(2);
  });

  it('skips bad rows with row numbers and keeps good ones', () => {
    const { rows, issues } = sales([
      SALES_HEADER,
      ['31/02/2026', 'R1', 'A1', 'X', 'C', '1', '10', '', '10', ''],
      ['01/02/2026', 'R2', '', '', 'C', '1', '10', '', '10', ''],
      ['01/02/2026', 'R3', 'A1', 'X', 'C', 'two', '10', '', '10', ''],
      [],
      ['01/02/2026', 'R4', 'A1', 'X', 'C', '1', '', '', '', ''],
      ['01/02/2026', 'R5', 'A1', 'X', 'C', '1', '10', '', '10', ''],
    ]);
    expect(rows.map((r) => r.row)).toEqual([7]);
    expect(issues.map((i) => [i.row, i.code])).toEqual([
      [2, 'badDate'],
      [3, 'missingRequired'],
      [4, 'badNumber'],
      [6, 'noAmount'],
    ]);
    expect(issues.every((i) => i.level === 'error')).toBe(true);
  });

  it('uses product name as the key when there is no SKU column', () => {
    const table: Table = [['Tarikh', 'Nama Barang', 'Kuantiti', 'Jumlah'], ['02/01/2026', 'Teh 500g', '2', '15.80']];
    const res = normalizeTable('sales', table, autoMap('sales', table[0]!), 0);
    expect((res.rows[0] as SaleRow).sku).toBe('Teh 500g');
    expect((res.rows[0] as SaleRow).unitPrice).toBe(7.9);
  });

  it('reads month-first dates when the column proves it', () => {
    const { rows } = sales([SALES_HEADER, ['01/25/2026', 'R', 'A', 'X', 'C', '1', '1', '', '1', ''], ['02/03/2026', 'R', 'A', 'X', 'C', '1', '1', '', '1', '']]);
    expect(rows.map((r) => r.date)).toEqual(['2026-01-25', '2026-02-03']);
  });

  it('handles an empty table and a header-only table', () => {
    expect(sales([SALES_HEADER]).rows).toEqual([]);
    expect(normalizeTable('sales', [], {}, 0).rows).toEqual([]);
  });

  it('strips control characters and caps long text', () => {
    const { rows } = sales([SALES_HEADER, ['01/02/2026', 'R', 'A', `<img src=x onerror=alert(1)>\u0007${'x'.repeat(500)}`, 'C', '1', '1', '', '1', '']]);
    expect(rows[0]!.name.length).toBe(200);
    expect(rows[0]!.name.includes(String.fromCharCode(7))).toBe(false);
  });
});

describe('normalize products', () => {
  const HEADER = ['SKU', 'Product Name', 'Category', 'Unit Cost', 'Quantity On Hand', 'Last Received Date'];
  const run = (table: Table) => normalizeTable('products', table, autoMap('products', table[0]!), 0) as { rows: ProductRow[]; issues: ReturnType<typeof normalizeTable>['issues'] };

  it('merges duplicate SKUs: adds quantity, weights cost, warns with rows', () => {
    const { rows, issues } = run([HEADER, ['A', 'X', 'C', '10', '10', ''], ['B', 'Y', 'C', '5', '1', ''], ['a', 'X', 'C', '20', '30', '05/01/2026']]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ sku: 'A', qtyOnHand: 40, unitCost: 17.5, rows: [2, 4], lastReceived: '2026-01-05' });
    expect(issues).toContainEqual(expect.objectContaining({ code: 'duplicateSku', rows: [2, 4], level: 'warning' }));
  });

  it('keeps negative stock with a warning and rejects negative cost', () => {
    const { rows, issues } = run([HEADER, ['A', 'X', 'C', '10', '-3', ''], ['B', 'Y', 'C', '-1', '1', '']]);
    expect(rows.map((r) => r.sku)).toEqual(['A']);
    expect(issues.map((i) => [i.row, i.code, i.level])).toEqual([
      [2, 'negativeStock', 'warning'],
      [3, 'negativeCost', 'error'],
    ]);
  });

  it('warns but keeps the row when an optional date is unreadable', () => {
    const { rows, issues } = run([HEADER, ['A', 'X', 'C', '10', '3', 'soon']]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.lastReceived).toBeUndefined();
    expect(issues[0]).toMatchObject({ code: 'badDate', level: 'warning', value: 'soon' });
  });
});

describe('normalize invoices and payments', () => {
  it('derives missing quantity/unit price from the total', () => {
    const table: Table = [['Supplier', 'Invoice No', 'Invoice Date', 'Description', 'Qty', 'Unit Price', 'Total', 'Due Date'], ['S', 'I1', '05/01/2026', 'X', '', '', '100', '04/02/2026'], ['S', 'I2', '05/01/2026', 'X', '4', '2.5', '', '']];
    const res = normalizeTable('invoices', table, autoMap('invoices', table[0]!), 0);
    expect(res.rows).toMatchObject([
      { invoiceNo: 'I1', qty: 1, unitPrice: 100, total: 100, dueDate: '2026-02-04' },
      { invoiceNo: 'I2', qty: 4, unitPrice: 2.5, total: 10, dueDate: undefined },
    ]);
  });

  it('requires supplier, invoice number and date', () => {
    const table: Table = [['Supplier', 'Invoice No', 'Invoice Date', 'Total'], ['', 'I1', '15/01/2026', '1'], ['S', '', '15/01/2026', '1'], ['S', 'I3', '', '1']];
    const res = normalizeTable('invoices', table, autoMap('invoices', table[0]!), 0);
    expect(res.rows).toEqual([]);
    expect(res.issues.map((i) => i.row)).toEqual([2, 3, 4]);
  });

  it('parses payments', () => {
    const table: Table = [['Payment Date', 'Supplier', 'Amount', 'Reference'], ['2026-02-01', 'S', '(1,000.00)', 'INV 1'], ['2026-02-01', 'S', 'abc', '']];
    const res = normalizeTable('payments', table, autoMap('payments', table[0]!), 0);
    expect(res.rows).toEqual([{ row: 2, date: '2026-02-01', supplier: 'S', amount: -1000, reference: 'INV 1' }]);
    expect(res.issues[0]).toMatchObject({ row: 3, code: 'badNumber', field: 'amount' });
  });
});
