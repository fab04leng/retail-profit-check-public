/**
 * Five realistic messy exports (tests/fixtures/messy/) go through the same path as an
 * upload: read → find header → map columns → normalise. Each must load without manual
 * fixes, read the right numbers, and explain anything odd with a friendly message.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runAll } from '../../src/analysis';
import { dateOrderEvidence } from '../../src/core/dates';
import { buildDataset, mappingProblems, stageTable, type StagedFile } from '../../src/core/ingest';
import { FIELDS } from '../../src/core/fields';
import { autoMap, headerLabels, headerTaxKind, isGroupRow, scoreHeader } from '../../src/core/mapping';
import { normalizeTable } from '../../src/core/normalize';
import { readTable } from '../../src/core/read';
import { templateCsv } from '../../src/core/templates';
import { ISSUE_CODES, type FileKind, type InvoiceRow, type ProductRow, type SaleRow, type Table } from '../../src/core/types';
import { translate } from '../../src/i18n';
import { defaultSettings } from '../../src/rules/settings';

const dir = join(__dirname, '../fixtures/messy');

async function stage(kind: FileKind, file: string): Promise<StagedFile> {
  const buf = readFileSync(join(dir, file));
  const table = await readTable(file, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
  return stageTable(kind, file, table);
}

/** Column header chosen for each field. */
const mapped = (f: StagedFile) => Object.fromEntries(Object.entries(f.mapping).map(([k, c]) => [k, String(f.headers[c!])]));
const codes = (issues: { code: string; row: number }[]) => issues.map((i) => `${i.row}:${i.code}`);
const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;

describe('messy file 1: POS sales report with title rows, a merged two-row header and subtotals', () => {
  it('finds the header under the merged group row and maps every column', async () => {
    const f = await stage('sales', '01-pos-sales-detail-merged-header.csv');
    expect(f.headerRow).toBe(5);
    expect(mappingProblems(f)).toEqual([]);
    expect(mapped(f)).toMatchObject({ sku: 'Item Code', name: 'Description', total: 'Amount (RM) Net', unitPrice: 'Price', discount: 'Disc', qty: 'Qty' });
  });

  it('reads thousands separators, refunds and skips subtotal, total and note rows quietly', async () => {
    const ds = buildDataset({ sales: await stage('sales', '01-pos-sales-detail-merged-header.csv') });
    const rows = ds.sales;
    expect(rows.map((r) => r.row)).toEqual([7, 8, 9, 12, 13, 14, 18, 19]);
    expect(rows.find((r) => r.row === 12)).toMatchObject({ sku: 'EL-001', unitPrice: 1299, total: 1199, date: '2026-10-02' });
    // "(38.90)" with a positive quantity: a refund, so both become negative.
    expect(rows.find((r) => r.row === 14)).toMatchObject({ qty: -1, total: -38.9 });
    expect(rows.find((r) => r.row === 13)).toMatchObject({ qty: -1, total: -20.2 });
    // 31 September does not exist: the row is listed with its row number, not guessed.
    expect(codes(ds.issues)).toEqual(['14:signFixed', '15:badDate']);
    expect(sum(rows.map((r) => r.total))).toBe(1313.37); // grand total 1,343.27 minus the invalid 29.90 row
  });
});

describe('messy file 2: Malay headers, SST columns, Malay month names and a "Jumlah Keseluruhan" row', () => {
  it('uses the amount before SST as revenue and ignores the SST columns', async () => {
    const f = await stage('sales', '02-sales-malay-sst.csv');
    expect(mappingProblems(f)).toEqual([]);
    expect(mapped(f)).toMatchObject({ date: 'Tarikh', receipt: 'No. Resit', sku: 'Kod Barang', qty: 'Kuantiti', unitPrice: 'Harga Seunit (RM)', discount: 'Diskaun (RM)', total: 'Jumlah Sebelum SST (RM)', outlet: 'Cawangan' });
    expect(Object.values(mapped(f))).not.toContain('SST (RM)');
  });

  it('reads Malay dates and decimal commas; explains the one bad quantity', async () => {
    const ds = buildDataset({ sales: await stage('sales', '02-sales-malay-sst.csv') });
    expect(ds.sales.map((r: SaleRow) => r.date)).toEqual(['2026-03-03', '2026-03-03', '2026-03-04', '2026-04-12', '2026-08-15', '2026-12-01']);
    expect(ds.sales.find((r) => r.row === 9)).toMatchObject({ qty: -1, total: -4.2 });
    expect(ds.sales.find((r) => r.row === 12)).toMatchObject({ discount: 1, total: 24.2 });
    expect(codes(ds.issues)).toEqual(['11:badNumber']);
    expect(translate('ms', 'issues.badNumber', { field: translate('ms', 'fields.qty'), value: 'dua' })).toBe('Kuantiti "dua" bukan nombor.');
  });
});

describe('messy file 3: month-first (US) dates, RM prefixes, % discounts and a receipt-type column', () => {
  it('reads MM/DD/YYYY dates when the file proves it', async () => {
    const ds = buildDataset({ sales: await stage('sales', '03-sales-us-dates-refund-type.csv') });
    expect(ds.sales.map((r) => r.date)).toEqual(['2026-03-14', '2026-03-14', '2026-03-04', '2026-03-20', '2026-04-02', '2026-04-03']);
    expect(ds.issues.some((i) => i.code === 'dateOrderAssumed' || i.code === 'dateOrderMixed')).toBe(false);
  });

  it('treats "Refund" lines as refunds, skips "Void" lines with a message, and applies % discounts', async () => {
    const f = await stage('sales', '03-sales-us-dates-refund-type.csv');
    expect(mapped(f)).toMatchObject({ lineType: 'Receipt type', receipt: 'Receipt number', total: 'Net sales' });
    const ds = buildDataset({ sales: f });
    expect(ds.sales.find((r) => r.row === 6)).toMatchObject({ qty: -1, total: -9.9 });
    expect(ds.sales.find((r) => r.row === 4)).toMatchObject({ discount: 0.99, total: 8.91 });
    expect(ds.sales.some((r) => r.row === 8)).toBe(false);
    expect(codes(ds.issues)).toEqual(['8:voidSkipped', '9:signFixed']);
    expect(sum(ds.sales.map((r) => r.total))).toBe(63.81);
  });
});

describe('messy file 4: supplier invoice listing with SST, credit note, re-keyed invoice and a missing date', () => {
  it('uses the amount including SST (what is paid) and never the SST column', async () => {
    const f = await stage('invoices', '04-supplier-invoices-sst.csv');
    expect(mappingProblems(f)).toEqual([]);
    expect(mapped(f)).toMatchObject({ supplier: 'Creditor Name', invoiceNo: 'Doc. No.', date: 'Doc. Date', unitPrice: 'Unit Price', total: 'Total incl. SST', dueDate: 'Due Date' });
  });

  it('reads the rows, explains the missing date, and the checks still find the duplicate and the price rise', async () => {
    const ds = buildDataset({ invoices: await stage('invoices', '04-supplier-invoices-sst.csv') });
    const inv = ds.invoices as InvoiceRow[];
    expect(inv).toHaveLength(7);
    expect(inv.find((r) => r.row === 7)).toMatchObject({ total: 1279.08, unitPrice: 9.69 });
    expect(inv.find((r) => r.row === 11)).toMatchObject({ qty: -2, total: -47.39 });
    expect(codes(ds.issues)).toEqual(['13:missingRequired']);
    const findings = runAll(ds, defaultSettings()).findings;
    expect(findings.find((x) => x.ruleId === 'SUP-01')).toMatchObject({ params: { invoiceNo: 'KB-00501', copies: 2 }, amount: 1436.88 });
    expect(findings.find((x) => x.ruleId === 'SUP-03')).toMatchObject({ params: { sku: 'NP-013', prevPrice: 9.69, newPrice: 10.45 } });
  });
});

describe('messy file 5: Excel stock balance with merged headers, text numbers, negative stock and a Total row', () => {
  it('folds the merged group header into the column names', async () => {
    const f = await stage('products', '05-stock-balance-merged-header.xlsx');
    expect(f.headerRow).toBe(4);
    expect(mappingProblems(f)).toEqual([]);
    expect(mapped(f)).toEqual({ sku: 'Item Code', name: 'Description', category: 'Group', qtyOnHand: 'Balance', unitCost: 'Cost (RM) Unit', lastReceived: 'Last GRN Date' });
  });

  it('reads the products and explains every odd row', async () => {
    const ds = buildDataset({ products: await stage('products', '05-stock-balance-merged-header.xlsx') });
    const p = ds.products as ProductRow[];
    expect(p.map((x) => x.sku)).toEqual(['RG-002', 'CT-002', 'FS-007', 'HH-015', 'ST-001']);
    expect(p[0]).toMatchObject({ qtyOnHand: 60, unitCost: 31.2, rows: [6, 7], lastReceived: '2026-10-28' });
    expect(p[1]).toMatchObject({ qtyOnHand: 1250, unitCost: 21.54, lastReceived: '2026-10-12' });
    expect(codes(ds.issues).sort()).toEqual(['11:negativeStock', '12:missingRequired', '13:zeroCost', '6:duplicateSku', '8:dateOrderAssumed'].sort());
  });
});

describe('header and row rules behind the messy files', () => {
  it('reads tax wording in headers', () => {
    expect(headerTaxKind('Amount excl. SST')).toBe('excl');
    expect(headerTaxKind('Jumlah Sebelum SST (RM)')).toBe('excl');
    expect(headerTaxKind('Jumlah Tidak Termasuk Cukai')).toBe('excl');
    expect(headerTaxKind('不含税金额')).toBe('excl');
    expect(headerTaxKind('Total incl. SST')).toBe('incl');
    expect(headerTaxKind('含税金额')).toBe('incl');
    expect(headerTaxKind('SST 10%')).toBe('taxOnly');
    expect(headerTaxKind('Total before discount')).toBe(null);
  });

  it('never maps a tax-only column to a money field', () => {
    for (const kind of ['sales', 'invoices', 'payments'] as const) {
      for (const f of FIELDS[kind].filter((x) => x.type === 'number')) expect(scoreHeader('SST Amount', f), `${kind}.${f.key}`).toBe(0);
    }
    expect(autoMap('payments', ['Date', 'Supplier', 'SST Amount', 'Amount Paid']).amount).toBe(3);
  });

  it('prefers a per-unit header over a total one for unit price', () => {
    expect(autoMap('products', ['SKU', 'Cost Total', 'Cost Unit', 'Stock']).unitCost).toBe(2);
  });

  it('recognises a merged group row only when it looks like one', () => {
    expect(isGroupRow(['Transaction', '', '', 'Amount (RM)', ''], ['Date', 'Receipt', 'Outlet', 'Price', 'Net'])).toBe(true);
    expect(isGroupRow(['Sales Detail Report', '', ''], ['Date', 'Qty', 'Total'])).toBe(false); // a single title
    expect(isGroupRow(['01/10/2026', 'J-1', '', ''], ['Date', 'Receipt', 'Qty', 'Total'])).toBe(false); // data
    const table: Table = [['Item', null, 'Amount', null], ['Code', 'Description', 'Price', 'Net']];
    expect(headerLabels('sales', table, 1)).toEqual(['Item Code', 'Description', 'Price', 'Amount Net']);
  });

  it('warns when every date could be read either way, and when a column mixes both orders', () => {
    expect(dateOrderEvidence(['03/04/2026', '05/06/2026', '07/07/2026'])).toMatchObject({ dmy: 0, mdy: 0, ambiguous: 2 });
    const ambiguous: Table = [['Date', 'SKU', 'Qty', 'Total'], ['03/04/2026', 'A', '1', '5'], ['05/04/2026', 'A', '1', '5']];
    const a = normalizeTable('sales', ambiguous, autoMap('sales', ambiguous[0]!), 0);
    expect((a.rows as SaleRow[]).map((r) => r.date)).toEqual(['2026-04-03', '2026-04-05']);
    expect(a.issues).toEqual([{ file: 'sales', row: 2, level: 'warning', code: 'dateOrderAssumed', field: 'date', value: '03/04/2026' }]);
    const mixed: Table = [['Date', 'SKU', 'Qty', 'Total'], ['25/03/2026', 'A', '1', '5'], ['03/26/2026', 'A', '1', '5']];
    const m = normalizeTable('sales', mixed, autoMap('sales', mixed[0]!), 0);
    expect(codes(m.issues)).toEqual(['3:dateOrderMixed', '3:badDate']);
  });

  it('skips note rows quietly but still reports a real row with a missing value', () => {
    const table: Table = [['Date', 'SKU', 'Qty', 'Total'], ['15/02/2026', 'A', '1', '5'], ['Page 1 of 2', '', '', ''], ['16/02/2026', 'B', '', '5']];
    const res = normalizeTable('sales', table, autoMap('sales', table[0]!), 0);
    expect(res.rows).toHaveLength(1);
    expect(codes(res.issues)).toEqual(['4:missingRequired']);
  });

  it('keeps the line type out of the blank template', () => {
    expect(templateCsv('sales').split('\n')[0]).not.toMatch(/type/i);
  });

  it('has a friendly message for every issue code in every language', () => {
    for (const lang of ['en', 'zh', 'ms'] as const) {
      for (const code of ISSUE_CODES) {
        const text = translate(lang, `issues.${code}`, { field: 'X', value: 'Y', rows: '1, 2' });
        expect(text, `${lang} issues.${code}`).not.toBe(`issues.${code}`);
        expect(text).not.toContain('{');
      }
      for (const kind of ['sales', 'products', 'invoices', 'payments'] as const) {
        for (const f of FIELDS[kind]) expect(translate(lang, `fields.${f.key}`), `${lang} fields.${f.key}`).not.toBe(`fields.${f.key}`);
      }
    }
  });
});

describe('net and gross totals', () => {
  it('takes the amount after discount when a file has both a total and a net total', () => {
    expect(autoMap('sales', ['Date', 'SKU', 'Qty', 'Total', 'Discount', 'Net Total']).total).toBe(5);
    expect(autoMap('sales', ['Date', 'SKU', 'Qty', 'Amount', 'Disc', 'Net Amount']).total).toBe(5);
    expect(autoMap('sales', ['Date', 'SKU', 'Qty', 'Gross Sales', 'Discounts', 'Net sales']).total).toBe(5);
    expect(autoMap('sales', ['Tarikh', 'Kod', 'Kuantiti', 'Jumlah Kasar', 'Jumlah Bersih']).total).toBe(4);
    expect(autoMap('invoices', ['Supplier', 'Invoice No', 'Date', 'Gross Amount', 'Net Amount']).total).toBe(4);
    // A single total is still taken as it is.
    expect(autoMap('sales', ['Date', 'SKU', 'Qty', 'Total']).total).toBe(3);
  });
});
