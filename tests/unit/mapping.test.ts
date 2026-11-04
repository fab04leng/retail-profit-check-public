import { describe, expect, it } from 'vitest';
import { autoMap, detectHeaderRow, layoutSignature, sanitizeMapping, validateMapping } from '../../src/core/mapping';

describe('autoMap', () => {
  it('maps English template headers', () => {
    const m = autoMap('sales', ['Date', 'Receipt No', 'SKU', 'Product Name', 'Category', 'Quantity', 'Unit Price', 'Discount', 'Total', 'Outlet']);
    expect(m).toEqual({ date: 0, receipt: 1, sku: 2, name: 3, category: 4, qty: 5, unitPrice: 6, discount: 7, total: 8, outlet: 9 });
  });

  it('maps Malay headers', () => {
    const m = autoMap('sales', ['Tarikh', 'No. Resit', 'Kod Item', 'Nama Barang', 'Kategori', 'Kuantiti', 'Harga Seunit (RM)', 'Diskaun', 'Jumlah (RM)', 'Cawangan']);
    expect(m).toEqual({ date: 0, receipt: 1, sku: 2, name: 3, category: 4, qty: 5, unitPrice: 6, discount: 7, total: 8, outlet: 9 });
  });

  it('maps Chinese headers', () => {
    const m = autoMap('products', ['货号', '品名', '类别', '成本', '库存数量', '最后进货日期']);
    expect(m).toEqual({ sku: 0, name: 1, category: 2, unitCost: 3, qtyOnHand: 4, lastReceived: 5 });
  });

  it('prefers "Unit Price" over "Unit" for price and does not reuse a column', () => {
    const m = autoMap('sales', ['Unit Price', 'Units', 'Txn Date', 'Item']);
    expect(m.unitPrice).toBe(0);
    expect(m.qty).toBe(1);
    expect(m.date).toBe(2);
    expect(m.name).toBe(3);
  });

  it('maps payments "Invoice No" to reference', () => {
    const m = autoMap('payments', ['Payment Date', 'Payee', 'Amount Paid', 'Invoice No']);
    expect(m).toEqual({ date: 0, supplier: 1, amount: 2, reference: 3 });
  });

  it('ignores unknown headers and empty headers', () => {
    expect(autoMap('payments', ['', null, 'Weather'])).toEqual({});
  });
});

describe('validateMapping', () => {
  it('reports missing required and one-of groups', () => {
    const problems = validateMapping('sales', { date: 0 });
    expect(problems).toContainEqual({ code: 'missingRequired', fields: ['qty'] });
    expect(problems).toContainEqual({ code: 'missingOneOf', fields: ['sku', 'name'] });
    expect(problems).toContainEqual({ code: 'missingOneOf', fields: ['unitPrice', 'total'] });
  });
  it('reports a column used twice', () => {
    const problems = validateMapping('payments', { date: 0, supplier: 1, amount: 1 });
    expect(problems).toContainEqual({ code: 'duplicateColumn', fields: ['supplier', 'amount'] });
  });
  it('accepts a complete mapping', () => {
    expect(validateMapping('payments', { date: 0, supplier: 1, amount: 2 })).toEqual([]);
  });
});

describe('header row and signatures', () => {
  it('skips title rows above the header', () => {
    const table = [['Sales Report Jan 2026'], ['Printed 01/02/2026'], [], ['Date', 'Item Code', 'Qty', 'Amount'], ['01/01/2026', 'A', '1', '2']];
    expect(detectHeaderRow('sales', table)).toBe(3);
  });
  it('falls back to the first non-empty row', () => {
    expect(detectHeaderRow('sales', [[], ['foo', 'bar']])).toBe(1);
  });
  it('gives the same signature regardless of case and spacing', () => {
    expect(layoutSignature('sales', ['Date', 'Qty'])).toBe(layoutSignature('sales', [' date ', 'QTY']));
    expect(layoutSignature('sales', ['Date', 'Qty'])).not.toBe(layoutSignature('products', ['Date', 'Qty']));
  });
  it('drops stale stored mapping entries', () => {
    expect(sanitizeMapping('payments', { date: 0, supplier: 9, amount: 'x', hacker: 1 }, 3)).toEqual({ date: 0 });
    expect(sanitizeMapping('payments', null, 3)).toBeNull();
  });
});
