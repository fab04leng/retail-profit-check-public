import type { DateOrderChoice } from './dates';
import { autoMap, bestHeaderLabels, detectHeaderRow, layoutSignature, sanitizeMapping, validateMapping, type Mapping, type MappingProblem } from './mapping';
import { normalizeTable } from './normalize';
import type { Cell, Dataset, FileKind, InvoiceRow, PaymentRow, ProductRow, SaleRow, Table } from './types';
import { emptyDataset } from './types';

/** A file that has been read and has a (proposed) column mapping, before normalising. */
export interface StagedFile {
  kind: FileKind;
  fileName: string;
  table: Table;
  headerRow: number;
  headers: Cell[];
  signature: string;
  mapping: Mapping;
  /** True when the mapping came from browser memory for this layout. */
  remembered: boolean;
  dataRowCount: number;
  /** Day/month order chosen on the mapping screen ('auto' = detect per column). */
  dateOrder: DateOrderChoice;
  /** Hash of the file's exact bytes; set by the engine when a real file is read. */
  contentHash?: string;
}

export function stageTable(kind: FileKind, fileName: string, table: Table, remembered?: unknown): StagedFile {
  const headerRow = detectHeaderRow(kind, table);
  const headers = bestHeaderLabels(kind, table, headerRow);
  const signature = layoutSignature(kind, headers);
  const stored = sanitizeMapping(kind, remembered, headers.length);
  const mapping = stored && Object.keys(stored).length ? stored : autoMap(kind, headers);
  return {
    kind,
    fileName,
    table,
    headerRow,
    headers,
    signature,
    mapping,
    remembered: !!(stored && Object.keys(stored).length),
    dataRowCount: Math.max(0, table.length - headerRow - 1),
    dateOrder: 'auto',
  };
}

export function mappingProblems(file: StagedFile): MappingProblem[] {
  return validateMapping(file.kind, file.mapping);
}

/** Normalise all staged files into one dataset. Files with mapping problems are skipped. */
export function buildDataset(files: Partial<Record<FileKind, StagedFile>>): Dataset {
  const ds = emptyDataset();
  for (const kind of ['sales', 'products', 'invoices', 'payments'] as const) {
    const f = files[kind];
    if (!f || validateMapping(kind, f.mapping).length) continue;
    const res = normalizeTable(kind, f.table, f.mapping, f.headerRow, f.dateOrder);
    ds.issues.push(...res.issues);
    ds.sources[kind] = f.fileName;
    if (kind === 'sales') ds.sales = res.rows as SaleRow[];
    else if (kind === 'products') ds.products = res.rows as ProductRow[];
    else if (kind === 'invoices') ds.invoices = res.rows as InvoiceRow[];
    else {
      ds.payments = res.rows as PaymentRow[];
      ds.hasPayments = true;
    }
  }
  return ds;
}
