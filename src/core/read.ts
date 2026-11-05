import Papa from 'papaparse';
import { readSheet } from 'read-excel-file/universal';
import type { Table } from './types';

export type ReadErrorCode = 'unsupportedType' | 'xlsNotSupported' | 'emptyFile' | 'unreadable' | 'tooLarge';

export class ReadError extends Error {
  constructor(public code: ReadErrorCode, message?: string) {
    super(message ?? code);
  }
}

/** 60 MB — beyond this a browser tab risks running out of memory. */
export const MAX_FILE_BYTES = 60 * 1024 * 1024;
/** Limits that keep crafted files from exhausting memory. */
export const MAX_UNZIPPED_BYTES = 400 * 1024 * 1024;
export const MAX_ROWS = 1_000_000;
export const MAX_COLUMNS = 200;
export const MAX_CELL_CHARS = 1000;

/**
 * Sum the uncompressed sizes declared in an .xlsx (zip) central directory,
 * so a "zip bomb" is refused before it is unpacked. Returns null if no directory is found.
 */
export function declaredUnzippedSize(buffer: ArrayBuffer): number | null {
  const v = new DataView(buffer);
  const n = buffer.byteLength;
  // End-of-central-directory record is within the last 64 KB + 22 bytes.
  for (let i = n - 22; i >= Math.max(0, n - 65_557); i--) {
    if (v.getUint32(i, true) !== 0x06054b50) continue;
    const count = v.getUint16(i + 10, true);
    let off = v.getUint32(i + 16, true);
    let total = 0;
    for (let k = 0; k < count && off + 46 <= n; k++) {
      if (v.getUint32(off, true) !== 0x02014b50) return null;
      total += v.getUint32(off + 24, true);
      off += 46 + v.getUint16(off + 28, true) + v.getUint16(off + 30, true) + v.getUint16(off + 32, true);
    }
    return total;
  }
  return null;
}

/** Cap rows, columns and very long text cells. */
function limitTable(table: Table): Table {
  if (table.length > MAX_ROWS) throw new ReadError('tooLarge');
  for (let r = 0; r < table.length; r++) {
    let row = table[r]!;
    if (row.length > MAX_COLUMNS) row = table[r] = row.slice(0, MAX_COLUMNS);
    for (let c = 0; c < row.length; c++) {
      const v = row[c];
      if (typeof v === 'string' && v.length > MAX_CELL_CHARS) row[c] = v.slice(0, MAX_CELL_CHARS);
    }
  }
  return table;
}

/** Decode bytes as UTF-8 (with BOM stripped); fall back to Windows-1252 if UTF-8 is invalid. */
export function decodeText(buffer: ArrayBuffer): string {
  let text: string;
  const b = new Uint8Array(buffer, 0, Math.min(2, buffer.byteLength));
  // "Unicode Text" exports from Excel are UTF-16 with a byte-order mark.
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder('utf-16le').decode(buffer.slice(2));
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder('utf-16be').decode(buffer.slice(2));
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    text = new TextDecoder('windows-1252').decode(buffer);
  }
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Parse CSV/TSV text into rows. Empty lines are kept (as empty rows) so that
 * row numbers match what the user sees when opening the file in Excel.
 */
export function parseCsvText(text: string): Table {
  const result = Papa.parse<string[]>(text, { skipEmptyLines: false, delimiter: '' });
  const rows = result.data;
  // PapaParse returns a trailing [''] for a final newline.
  while (rows.length && rows[rows.length - 1]!.every((c) => c === '')) rows.pop();
  return rows;
}

export function fileExtension(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m?.[1] ?? '';
}

/** Read a CSV or XLSX file's first sheet into a table of raw cells. */
export async function readTable(name: string, buffer: ArrayBuffer): Promise<Table> {
  if (buffer.byteLength > MAX_FILE_BYTES) throw new ReadError('tooLarge');
  if (buffer.byteLength === 0) throw new ReadError('emptyFile');
  const ext = fileExtension(name);
  let table: Table;
  if (ext === 'csv' || ext === 'txt' || ext === 'tsv') {
    table = parseCsvText(decodeText(buffer));
  } else if (ext === 'xlsx' || ext === 'xlsm') {
    const unzipped = declaredUnzippedSize(buffer);
    if (unzipped !== null && unzipped > MAX_UNZIPPED_BYTES) throw new ReadError('tooLarge');
    try {
      table = (await readSheet(buffer)) as Table;
    } catch {
      throw new ReadError('unreadable');
    }
  } else if (ext === 'xls') {
    throw new ReadError('xlsNotSupported');
  } else {
    throw new ReadError('unsupportedType');
  }
  if (!table.length || table.every((r) => r.every((c) => c === null || c === undefined || String(c).trim() === ''))) {
    throw new ReadError('emptyFile');
  }
  return limitTable(table);
}
