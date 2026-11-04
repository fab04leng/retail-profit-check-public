import { describe, expect, it } from 'vitest';
import writeXlsxFile from 'write-excel-file/node';
import { decodeText, parseCsvText, ReadError, readTable } from '../../src/core/read';
import { stageTable, buildDataset, mappingProblems } from '../../src/core/ingest';

const enc = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;

describe('CSV reading', () => {
  it('keeps blank lines so row numbers match Excel', () => {
    const t = parseCsvText('a,b\n1,2\n\n3,4\n');
    expect(t).toEqual([['a', 'b'], ['1', '2'], [''], ['3', '4']]);
  });
  it('handles quoted commas, semicolons and tabs', () => {
    expect(parseCsvText('a,b\n"1,234.50",x')[1]).toEqual(['1,234.50', 'x']);
    expect(parseCsvText('a;b\n1;2')[1]).toEqual(['1', '2']);
    expect(parseCsvText('a\tb\n1\t2')[1]).toEqual(['1', '2']);
  });
  it('strips a UTF-8 BOM and reads Chinese headers', () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('日期,金额\n')]);
    expect(decodeText(bytes.buffer)).toBe('日期,金额\n');
  });
  it('falls back to Windows-1252 for non-UTF-8 files', () => {
    expect(decodeText(new Uint8Array([0x63, 0x61, 0x66, 0xe9]).buffer)).toBe('café');
  });
});

describe('readTable', () => {
  it('rejects empty, .xls and unknown files with friendly codes', async () => {
    await expect(readTable('a.csv', new ArrayBuffer(0))).rejects.toMatchObject({ code: 'emptyFile' });
    await expect(readTable('a.csv', enc('\n,,\n'))).rejects.toMatchObject({ code: 'emptyFile' });
    await expect(readTable('a.xls', enc('x'))).rejects.toMatchObject({ code: 'xlsNotSupported' });
    await expect(readTable('a.pdf', enc('x'))).rejects.toBeInstanceOf(ReadError);
  });
  it('rejects a corrupt xlsx without crashing', async () => {
    await expect(readTable('a.xlsx', enc('not a zip'))).rejects.toMatchObject({ code: 'unreadable' });
  });
  it('reads a real xlsx including date cells and numbers', async () => {
    const buf = await writeXlsxFile([
      [{ value: 'Tarikh' }, { value: 'Kod Item' }, { value: 'Kuantiti' }, { value: 'Jumlah' }],
      [{ value: new Date(Date.UTC(2026, 0, 12)), type: Date, format: 'dd/mm/yyyy' }, { value: 'A1' }, { value: 2 }, { value: 19.8 }],
    ]).toBuffer();
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    const table = await readTable('jualan.xlsx', ab);
    const staged = stageTable('sales', 'jualan.xlsx', table);
    expect(mappingProblems(staged)).toEqual([]);
    const ds = buildDataset({ sales: staged });
    expect(ds.sales[0]).toMatchObject({ date: '2026-01-12', sku: 'A1', qty: 2, total: 19.8 });
  });
});

describe('stageTable / buildDataset', () => {
  it('uses a remembered mapping when it fits the file', () => {
    const table = [['Col A', 'Col B', 'Col C'], ['2026-01-01', 'S', '10']];
    const staged = stageTable('payments', 'p.csv', table, { date: 0, supplier: 1, amount: 2 });
    expect(staged.remembered).toBe(true);
    expect(buildDataset({ payments: staged }).payments).toHaveLength(1);
  });
  it('skips files whose mapping is incomplete', () => {
    const staged = stageTable('payments', 'p.csv', [['Col A'], ['x']]);
    const ds = buildDataset({ payments: staged });
    expect(ds.hasPayments).toBe(false);
  });
});
