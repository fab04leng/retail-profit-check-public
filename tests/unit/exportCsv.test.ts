import { describe, expect, it } from 'vitest';
import { safeCell, safeExcelText, toCsv } from '../../src/core/exportCsv';
import { parseCsvText } from '../../src/core/read';
import { templateCsv } from '../../src/core/templates';
import { autoMap, validateMapping } from '../../src/core/mapping';
import { FILE_KINDS } from '../../src/core/types';

describe('CSV formula-injection guard', () => {
  it.each([['=1+1'], ['+SUM(A1)'], ['-2+3'], ['@cmd'], ['\t=x'], ['\r=x']])('neutralises %j', (v) => {
    expect(safeCell(v).replace(/^"|"$/g, '').startsWith("'")).toBe(true);
    expect(safeExcelText(v).startsWith("'")).toBe(true);
  });
  it('leaves plain numbers and text alone', () => {
    expect(safeCell(-5)).toBe('-5');
    expect(safeCell('-5')).toBe('-5');
    expect(safeCell('Beras')).toBe('Beras');
  });
  it('quotes commas, quotes and newlines', () => {
    expect(safeCell('a,b')).toBe('"a,b"');
    expect(safeCell('say "hi"')).toBe('"say ""hi"""');
    expect(toCsv([['a', 1], ['b\nc', 2]])).toBe('a,1\r\n"b\nc",2\r\n');
  });
});

describe('templates', () => {
  it.each(FILE_KINDS)('the %s template maps cleanly to every field', (kind) => {
    const t = parseCsvText(templateCsv(kind));
    expect(t).toHaveLength(3);
    const m = autoMap(kind, t[0]!);
    expect(validateMapping(kind, m)).toEqual([]);
    expect(Object.keys(m).length).toBe(t[0]!.length);
  });
});
