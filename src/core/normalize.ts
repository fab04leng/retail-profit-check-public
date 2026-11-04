import { detectDateOrder, parseDate, type DateOrder } from './dates';
import { FIELDS } from './fields';
import type { Mapping } from './mapping';
import { parseNumber, parsePercent, roundRM } from './numbers';
import type { Cell, FileKind, InvoiceRow, PaymentRow, ProductRow, RowIssue, SaleRow, Table } from './types';

const MAX_TEXT = 200;

export function cleanText(v: Cell): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
  // Strip control characters (except none) and collapse whitespace; cap length.
  // eslint-disable-next-line no-control-regex
  return String(v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
}

function shortValue(v: Cell): string {
  return cleanText(v).slice(0, 40);
}

function isBlankRow(row: Cell[] | undefined): boolean {
  return !row || row.every((c) => c === null || c === undefined || String(c).trim() === '');
}

interface Ctx {
  kind: FileKind;
  issues: RowIssue[];
  orders: Record<string, DateOrder>;
}

/** Per-row helpers. Return undefined when the column is not mapped. */
function makeAccess(row: Cell[], mapping: Mapping) {
  return (key: string): Cell => {
    const col = mapping[key];
    return col === undefined ? undefined : row[col];
  };
}

function isEmpty(v: Cell): boolean {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

export interface NormalizeResult<T> {
  rows: T[];
  issues: RowIssue[];
}

export function normalizeTable<K extends FileKind>(
  kind: K,
  table: Table,
  mapping: Mapping,
  headerRow: number,
): NormalizeResult<K extends 'sales' ? SaleRow : K extends 'products' ? ProductRow : K extends 'invoices' ? InvoiceRow : PaymentRow> {
  const ctx: Ctx = { kind, issues: [], orders: {} };
  // Decide DD/MM vs MM/DD per date column from the column's own values.
  for (const f of FIELDS[kind]) {
    if (f.type !== 'date') continue;
    const col = mapping[f.key];
    if (col === undefined) continue;
    const values: Cell[] = [];
    for (let r = headerRow + 1; r < table.length; r++) values.push(table[r]?.[col]);
    ctx.orders[f.key] = detectDateOrder(values);
  }
  const out: unknown[] = [];
  for (let r = headerRow + 1; r < table.length; r++) {
    const raw = table[r];
    if (isBlankRow(raw)) continue;
    const rowNo = r + 1; // spreadsheet row number
    const get = makeAccess(raw!, mapping);
    const parsed =
      kind === 'sales' ? saleRow(get, rowNo, ctx)
      : kind === 'products' ? productRow(get, rowNo, ctx)
      : kind === 'invoices' ? invoiceRow(get, rowNo, ctx)
      : paymentRow(get, rowNo, ctx);
    if (parsed) out.push(parsed);
  }
  let rows = out;
  if (kind === 'products') rows = mergeDuplicateSkus(out as ProductRow[], ctx);
  return { rows: rows as never, issues: ctx.issues };
}

type Get = (key: string) => Cell;

function issue(ctx: Ctx, row: number, level: RowIssue['level'], code: RowIssue['code'], field?: string, value?: Cell): void {
  ctx.issues.push({ file: ctx.kind, row, level, code, field, value: value === undefined ? undefined : shortValue(value) });
}

/** Required number: issue + undefined if bad. Optional: default if empty. */
function num(get: Get, key: string, row: number, ctx: Ctx, opts: { required?: boolean; fallback?: number } = {}): number | undefined {
  const v = get(key);
  if (isEmpty(v)) {
    if (opts.required) {
      issue(ctx, row, 'error', 'missingRequired', key);
      return undefined;
    }
    return opts.fallback;
  }
  const n = parseNumber(v);
  if (n === null) {
    issue(ctx, row, opts.required ? 'error' : 'warning', 'badNumber', key, v);
    return opts.required ? undefined : opts.fallback;
  }
  return n;
}

function date(get: Get, key: string, row: number, ctx: Ctx, required: boolean): string | undefined | null {
  const v = get(key);
  if (isEmpty(v)) {
    if (required) issue(ctx, row, 'error', 'missingRequired', key);
    return required ? null : undefined;
  }
  const d = parseDate(v, ctx.orders[key] ?? 'DMY');
  if (!d) {
    issue(ctx, row, required ? 'error' : 'warning', 'badDate', key, v);
    return required ? null : undefined;
  }
  return d;
}

function saleRow(get: Get, row: number, ctx: Ctx): SaleRow | null {
  const d = date(get, 'date', row, ctx, true);
  const sku = cleanText(get('sku'));
  const name = cleanText(get('name'));
  if (!sku && !name) {
    issue(ctx, row, 'error', 'missingRequired', 'sku');
    return null;
  }
  let qty = num(get, 'qty', row, ctx, { required: true });
  const unitPrice = num(get, 'unitPrice', row, ctx, {});
  const rawDiscount = get('discount');
  const pct = parsePercent(rawDiscount);
  let discount: number;
  if (pct !== null && unitPrice !== undefined && qty !== undefined) {
    discount = roundRM((Math.abs(qty * unitPrice) * pct) / 100);
  } else {
    discount = num(get, 'discount', row, ctx, { fallback: 0 }) ?? 0;
  }
  let total = num(get, 'total', row, ctx, {});
  if (!d || qty === undefined) return null;
  if (total === undefined) {
    if (unitPrice === undefined) {
      issue(ctx, row, 'error', 'noAmount', 'total');
      return null;
    }
    // Refund lines: discount reduces the refunded amount too.
    total = roundRM(qty * unitPrice - Math.sign(qty || 1) * Math.abs(discount));
  }
  // Some POS exports show refunds with a positive quantity and negative amount (or the reverse).
  if (qty > 0 && total < 0) {
    qty = -qty;
    issue(ctx, row, 'warning', 'signFixed', 'qty');
  } else if (qty < 0 && total > 0) {
    total = -total;
    issue(ctx, row, 'warning', 'signFixed', 'total');
  }
  return {
    row,
    date: d,
    receipt: cleanText(get('receipt')),
    sku: sku || name,
    name: name || sku,
    category: cleanText(get('category')) || 'Uncategorised',
    qty,
    unitPrice: unitPrice ?? (qty !== 0 ? roundRM(total / qty) : 0),
    discount: Math.abs(discount),
    total,
    outlet: cleanText(get('outlet')),
  };
}

function productRow(get: Get, row: number, ctx: Ctx): ProductRow | null {
  const sku = cleanText(get('sku'));
  const name = cleanText(get('name'));
  if (!sku && !name) {
    issue(ctx, row, 'error', 'missingRequired', 'sku');
    return null;
  }
  const unitCost = num(get, 'unitCost', row, ctx, { required: true });
  const qtyOnHand = num(get, 'qtyOnHand', row, ctx, { required: true });
  const lastReceived = date(get, 'lastReceived', row, ctx, false) ?? undefined;
  if (unitCost === undefined || qtyOnHand === undefined) return null;
  if (unitCost < 0) {
    issue(ctx, row, 'error', 'negativeCost', 'unitCost', get('unitCost'));
    return null;
  }
  if (qtyOnHand < 0) issue(ctx, row, 'warning', 'negativeStock', 'qtyOnHand', get('qtyOnHand'));
  return {
    row,
    rows: [row],
    sku: sku || name,
    name: name || sku,
    category: cleanText(get('category')) || 'Uncategorised',
    unitCost,
    qtyOnHand,
    lastReceived,
  };
}

/**
 * The same SKU listed more than once (e.g. once per outlet): quantities are added,
 * unit cost becomes the quantity-weighted average, a warning lists the rows.
 */
function mergeDuplicateSkus(rows: ProductRow[], ctx: Ctx): ProductRow[] {
  const bySku = new Map<string, ProductRow>();
  const order: ProductRow[] = [];
  for (const p of rows) {
    const key = p.sku.toUpperCase();
    const existing = bySku.get(key);
    if (!existing) {
      const copy = { ...p, rows: [...p.rows] };
      bySku.set(key, copy);
      order.push(copy);
      continue;
    }
    const q1 = Math.max(0, existing.qtyOnHand);
    const q2 = Math.max(0, p.qtyOnHand);
    existing.unitCost = q1 + q2 > 0 ? (existing.unitCost * q1 + p.unitCost * q2) / (q1 + q2) : existing.unitCost;
    existing.qtyOnHand += p.qtyOnHand;
    existing.rows.push(p.row);
    if (p.lastReceived && (!existing.lastReceived || p.lastReceived > existing.lastReceived)) existing.lastReceived = p.lastReceived;
  }
  for (const p of order) {
    if (p.rows.length > 1) ctx.issues.push({ file: 'products', row: p.row, level: 'warning', code: 'duplicateSku', field: 'sku', value: p.sku.slice(0, 40), rows: p.rows });
  }
  return order;
}

function invoiceRow(get: Get, row: number, ctx: Ctx): InvoiceRow | null {
  const supplier = cleanText(get('supplier'));
  const invoiceNo = cleanText(get('invoiceNo'));
  const d = date(get, 'date', row, ctx, true);
  if (!supplier) issue(ctx, row, 'error', 'missingRequired', 'supplier');
  if (!invoiceNo) issue(ctx, row, 'error', 'missingRequired', 'invoiceNo');
  let qty = num(get, 'qty', row, ctx, {});
  let unitPrice = num(get, 'unitPrice', row, ctx, {});
  let total = num(get, 'total', row, ctx, {});
  const dueDate = date(get, 'dueDate', row, ctx, false) ?? undefined;
  if (!supplier || !invoiceNo || !d) return null;
  if (total === undefined) {
    if (unitPrice === undefined) {
      issue(ctx, row, 'error', 'noAmount', 'total');
      return null;
    }
    total = roundRM((qty ?? 1) * unitPrice);
  }
  if (qty === undefined) qty = unitPrice !== undefined && unitPrice !== 0 ? total / unitPrice : 1;
  if (unitPrice === undefined) unitPrice = qty !== 0 ? total / qty : total;
  return {
    row,
    supplier,
    invoiceNo,
    date: d,
    sku: cleanText(get('sku')),
    description: cleanText(get('description')),
    qty,
    unitPrice,
    total,
    dueDate,
  };
}

function paymentRow(get: Get, row: number, ctx: Ctx): PaymentRow | null {
  const d = date(get, 'date', row, ctx, true);
  const supplier = cleanText(get('supplier'));
  if (!supplier) issue(ctx, row, 'error', 'missingRequired', 'supplier');
  const amount = num(get, 'amount', row, ctx, { required: true });
  if (!d || !supplier || amount === undefined) return null;
  return { row, date: d, supplier, amount, reference: cleanText(get('reference')) };
}
