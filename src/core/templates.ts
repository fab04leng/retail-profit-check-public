import { toCsv } from './exportCsv';
import { templateFields } from './fields';
import type { FileKind } from './types';

/** English column headers used in the blank templates (the wizard also accepts BM/中文). */
export const TEMPLATE_HEADERS: Record<FileKind, Record<string, string>> = {
  sales: { date: 'Date', receipt: 'Receipt No', sku: 'SKU', name: 'Product Name', category: 'Category', qty: 'Quantity', unitPrice: 'Unit Price', discount: 'Discount', total: 'Total', outlet: 'Outlet' },
  products: { sku: 'SKU', name: 'Product Name', category: 'Category', unitCost: 'Unit Cost', qtyOnHand: 'Quantity On Hand', lastReceived: 'Last Received Date' },
  invoices: { supplier: 'Supplier', invoiceNo: 'Invoice No', date: 'Invoice Date', sku: 'SKU', description: 'Description', qty: 'Quantity', unitPrice: 'Unit Price', total: 'Total', dueDate: 'Due Date' },
  payments: { date: 'Payment Date', supplier: 'Supplier', amount: 'Amount', reference: 'Reference' },
};

/** Blank template: header row plus two example rows (examples are invented). */
export function templateCsv(kind: FileKind): string {
  const fields = templateFields(kind);
  const header = fields.map((f) => TEMPLATE_HEADERS[kind][f.key] ?? f.key);
  const ex1 = fields.map((f) => f.example[0]);
  const ex2 = fields.map((f) => f.example[1]);
  return toCsv([header, ex1, ex2]);
}
