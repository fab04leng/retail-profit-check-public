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

/** Decode bytes as UTF-8 (with BOM stripped); fall back to Windows-1252 if UTF-8 is invalid. */
export function decodeText(buffer: ArrayBuffer): string {
  let text: string;
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
  return table;
}
