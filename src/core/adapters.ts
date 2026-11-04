/**
 * Layout presets for common Malaysian POS / accounting exports.
 *
 * ALL PRESETS ARE UNVERIFIED: no real export file from these systems has been
 * tested. Each header is tagged:
 *   - 'documented': the name appears in the vendor's public help/wiki (source noted),
 *   - 'guess': a likely name based on common report wording — treat with care.
 * A preset only pre-selects columns; the user always checks the mapping wizard.
 * Sources were found by web search on 4 Nov 2026; the vendor pages themselves
 * could not be opened from the build environment.
 */
import { normalizeHeader } from './fields';
import { autoMap, type Mapping } from './mapping';
import type { Cell, FileKind } from './types';

export type Confidence = 'documented' | 'guess';

export interface PresetHeader {
  header: string;
  field: string;
  confidence: Confidence;
}

export interface LayoutPreset {
  id: 'loyverse' | 'storehub' | 'autocount' | 'sqlaccount';
  name: string;
  verified: false;
  sources: string[];
  headers: Partial<Record<FileKind, PresetHeader[]>>;
}

const d = (header: string, field: string): PresetHeader => ({ header, field, confidence: 'documented' });
const g = (header: string, field: string): PresetHeader => ({ header, field, confidence: 'guess' });

export const PRESETS: LayoutPreset[] = [
  {
    id: 'loyverse',
    name: 'Loyverse POS',
    verified: false,
    sources: [
      'help.loyverse.com — "Sales by Item Report in the Back Office" (Net sales = after discounts and refunds; Cost of goods)',
      'help.loyverse.com — "How to Export Data from Loyverse Account" (receipts and receipts-by-item CSV exports; columns not listed)',
    ],
    headers: {
      sales: [g('Date', 'date'), g('Receipt number', 'receipt'), g('SKU', 'sku'), g('Item', 'name'), g('Category', 'category'), g('Quantity', 'qty'), d('Net sales', 'total'), g('Discounts', 'discount'), g('Store', 'outlet')],
      products: [g('SKU', 'sku'), g('Name', 'name'), g('Category', 'category'), d('Cost', 'unitCost'), g('In stock', 'qtyOnHand')],
    },
  },
  {
    id: 'storehub',
    name: 'StoreHub BackOffice',
    verified: false,
    sources: ['care.storehub.com — stock management exports with item details (Date, Reference Number, Supplier, Outlet); transactions CSV columns not listed'],
    headers: {
      invoices: [d('Date', 'date'), d('Reference Number', 'invoiceNo'), d('Supplier', 'supplier'), g('SKU', 'sku'), g('Product Name', 'description'), g('Quantity', 'qty'), g('Unit Cost', 'unitPrice'), g('Total', 'total')],
      sales: [g('Transaction Date', 'date'), g('Receipt Number', 'receipt'), g('SKU', 'sku'), g('Product Name', 'name'), g('Quantity', 'qty'), g('Total', 'total'), d('Outlet', 'outlet')],
    },
  },
  {
    id: 'autocount',
    name: 'AutoCount Accounting',
    verified: false,
    sources: ['wiki.autocountsoft.com — grid "Export to Excel" from detail listing reports; no column list published'],
    headers: {
      products: [g('Item Code', 'sku'), g('Description', 'name'), g('Item Group', 'category'), g('Balance Qty', 'qtyOnHand'), g('Ref. Cost', 'unitCost')],
      invoices: [g('Doc. No.', 'invoiceNo'), g('Doc. Date', 'date'), g('Creditor Name', 'supplier'), g('Item Code', 'sku'), g('Description', 'description'), g('Qty', 'qty'), g('Unit Price', 'unitPrice'), g('SubTotal', 'total'), g('Due Date', 'dueDate')],
      payments: [g('Doc. Date', 'date'), g('Creditor Name', 'supplier'), g('Amount', 'amount'), g('Knock Off Doc. No.', 'reference')],
    },
  },
  {
    id: 'sqlaccount',
    name: 'SQL Account',
    verified: false,
    sources: ['wiki.sql.com.my — "SQL Text Import" (DOCNO = document number, DOCDATE in DD/MM/YYYY, CODE = customer/supplier account code)'],
    headers: {
      invoices: [d('DOCNO', 'invoiceNo'), d('DOCDATE', 'date'), d('CODE', 'supplier'), g('COMPANYNAME', 'supplier'), g('ITEMCODE', 'sku'), d('DESCRIPTION', 'description'), g('QTY', 'qty'), g('UNITPRICE', 'unitPrice'), g('AMOUNT', 'total'), g('DUEDATE', 'dueDate')],
      payments: [d('DOCDATE', 'date'), d('CODE', 'supplier'), g('DOCAMT', 'amount'), g('DESCRIPTION', 'reference')],
    },
  },
];

export function presetById(id: string | null | undefined): LayoutPreset | undefined {
  return PRESETS.find((p) => p.id === id);
}

/** Map columns using a preset's header names first, then the normal auto-detection for anything left. */
export function presetMap(kind: FileKind, headers: Cell[], preset: LayoutPreset): Mapping {
  const base = autoMap(kind, headers);
  const list = preset.headers[kind] ?? [];
  const norm = headers.map(normalizeHeader);
  const out: Mapping = {};
  const used = new Set<number>();
  for (const h of list) {
    if (out[h.field] !== undefined) continue;
    const col = norm.indexOf(normalizeHeader(h.header));
    if (col >= 0 && !used.has(col)) {
      out[h.field] = col;
      used.add(col);
    }
  }
  for (const [field, col] of Object.entries(base)) {
    if (col !== undefined && out[field] === undefined && !used.has(col)) {
      out[field] = col;
      used.add(col);
    }
  }
  return out;
}

/**
 * Guess the source system from vendor-specific headers (at least two distinctive
 * matches). Returns undefined when unsure. Generic names like "Date" don't count.
 */
export function detectPreset(kind: FileKind, headers: Cell[]): LayoutPreset | undefined {
  const norm = new Set(headers.map(normalizeHeader));
  const generic = new Set(['date', 'sku', 'quantity', 'qty', 'total', 'category', 'description', 'amount', 'name', 'supplier', 'item']);
  let best: { p: LayoutPreset; n: number } | undefined;
  for (const p of PRESETS) {
    const n = (p.headers[kind] ?? []).filter((h) => !generic.has(normalizeHeader(h.header)) && norm.has(normalizeHeader(h.header))).length;
    if (n >= 2 && (!best || n > best.n)) best = { p, n };
  }
  return best?.p;
}
