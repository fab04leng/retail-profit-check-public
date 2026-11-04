/** Normalised data the analyses work on. Dates are ISO `YYYY-MM-DD` strings. */

export type FileKind = 'sales' | 'products' | 'invoices' | 'payments';
export const FILE_KINDS: readonly FileKind[] = ['sales', 'products', 'invoices', 'payments'];

export interface SaleRow {
  /** Spreadsheet row number as the user sees it (header row = 1). */
  row: number;
  date: string;
  receipt: string;
  sku: string;
  name: string;
  category: string;
  /** Negative for refunds/returns. */
  qty: number;
  unitPrice: number;
  discount: number;
  /** Net line amount in RM (after discount). Negative for refunds. */
  total: number;
  outlet: string;
}

export interface ProductRow {
  row: number;
  /** All source rows when the same SKU appeared more than once (merged). */
  rows: number[];
  sku: string;
  name: string;
  category: string;
  unitCost: number;
  /** As given (may be negative; analyses treat negative as zero). */
  qtyOnHand: number;
  lastReceived?: string;
}

export interface InvoiceRow {
  row: number;
  supplier: string;
  invoiceNo: string;
  date: string;
  sku: string;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
  dueDate?: string;
}

export interface PaymentRow {
  row: number;
  date: string;
  supplier: string;
  amount: number;
  reference: string;
}

export type IssueCode =
  | 'missingRequired'
  | 'badNumber'
  | 'badDate'
  | 'negativeStock'
  | 'negativeCost'
  | 'duplicateSku'
  | 'noAmount'
  | 'signFixed'
  | 'unknownSku';

export interface RowIssue {
  file: FileKind;
  row: number;
  /** 'error' = row skipped; 'warning' = row kept, but check it. */
  level: 'error' | 'warning';
  code: IssueCode;
  field?: string;
  /** The offending raw value, shortened. Display as text only. */
  value?: string;
  /** Other rows involved (e.g. duplicate SKU rows). */
  rows?: number[];
}

export interface Dataset {
  sales: SaleRow[];
  products: ProductRow[];
  invoices: InvoiceRow[];
  payments: PaymentRow[];
  /** Whether a payments file was provided (changes which rules run). */
  hasPayments: boolean;
  issues: RowIssue[];
  /** Display names of the source files, by kind. */
  sources: Partial<Record<FileKind, string>>;
}

export function emptyDataset(): Dataset {
  return { sales: [], products: [], invoices: [], payments: [], hasPayments: false, issues: [], sources: {} };
}

/** A raw cell from CSV (string) or XLSX (string | number | boolean | Date). */
export type Cell = string | number | boolean | Date | null | undefined;
export type Table = Cell[][];
