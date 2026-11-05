import type { InvoiceRow, PaymentRow, ProductRow, SaleRow } from '../../src/core/types';

let row = 1;
export function resetRows() {
  row = 1;
}

export function sale(p: Partial<SaleRow> & { sku: string; date: string; qty: number; total: number }): SaleRow {
  row++;
  return { row, receipt: `R${row}`, name: p.sku, category: 'Cat', unitPrice: p.qty ? p.total / p.qty : 0, discount: 0, outlet: 'A', ...p };
}

export function product(p: Partial<ProductRow> & { sku: string; unitCost: number; qtyOnHand: number }): ProductRow {
  row++;
  return { row, rows: [row], name: p.sku, category: 'Cat', ...p, ...(p.rows ? {} : { rows: [row] }) };
}

export function invoice(p: Partial<InvoiceRow> & { supplier: string; invoiceNo: string; date: string; total: number }): InvoiceRow {
  row++;
  return { row, sku: '', description: 'Item', qty: 1, unitPrice: p.total, ...p };
}

export function payment(p: Partial<PaymentRow> & { supplier: string; date: string; amount: number }): PaymentRow {
  row++;
  return { row, reference: '', ...p };
}
