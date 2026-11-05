import { describe, expect, it } from 'vitest';
import { detectDateOrder, type DateOrderChoice } from '../../src/core/dates';
import { buildDataset, stageTable } from '../../src/core/ingest';
import { autoMap } from '../../src/core/mapping';
import { normalizeTable } from '../../src/core/normalize';
import type { SaleRow, Table } from '../../src/core/types';
import { defaultSettings } from '../../src/rules/settings';
import { EngineCore } from '../../src/worker/core';

// FINAL_REVIEW item 8: the owner can choose the date order (Auto / DD/MM / MM/DD) on the
// column-mapping screen, and the choice overrides detection.

const AMBIGUOUS: Table = [['Date', 'SKU', 'Qty', 'Total'], ['03/04/2026', 'A', '1', '5'], ['05/04/2026', 'A', '1', '5']];
const LOOKS_MDY: Table = [['Date', 'SKU', 'Qty', 'Total'], ['03/25/2026', 'A', '1', '5'], ['03/04/2026', 'A', '1', '5']];

function run(table: Table, order?: DateOrderChoice) {
  const res = normalizeTable('sales', table, autoMap('sales', table[0]!), 0, order);
  return { dates: (res.rows as SaleRow[]).map((r) => r.date), codes: res.issues.map((i) => `${i.row}:${i.code}`) };
}

describe('date-order choice', () => {
  it('Auto keeps detection: ambiguous dates are read day-first, with a warning', () => {
    expect(run(AMBIGUOUS, 'auto')).toEqual({ dates: ['2026-04-03', '2026-04-05'], codes: ['2:dateOrderAssumed'] });
    expect(run(AMBIGUOUS)).toEqual(run(AMBIGUOUS, 'auto'));
  });

  it('MM/DD overrides detection and drops the "assumed" warning', () => {
    expect(run(AMBIGUOUS, 'MDY')).toEqual({ dates: ['2026-03-04', '2026-05-04'], codes: [] });
  });

  it('DD/MM overrides a file that detection reads month-first; rows that do not fit are errors', () => {
    expect(detectDateOrder(LOOKS_MDY.slice(1).map((r) => r[0]))).toBe('MDY');
    expect(run(LOOKS_MDY, 'DMY')).toEqual({ dates: ['2026-04-03'], codes: ['2:badDate'] });
  });

  it('applies to every date column of the file (invoice date and due date)', () => {
    const table: Table = [['Invoice No', 'Invoice Date', 'Supplier', 'Amount', 'Due Date'], ['I-1', '03/04/2026', 'S', '10', '04/05/2026']];
    const res = normalizeTable('invoices', table, autoMap('invoices', table[0]!), 0, 'MDY');
    expect(res.rows[0]).toMatchObject({ date: '2026-03-04', dueDate: '2026-04-05' });
    expect(res.issues).toEqual([]);
  });

  it('a staged file starts on Auto and buildDataset uses its chosen order', () => {
    const staged = stageTable('sales', 's.csv', AMBIGUOUS);
    expect(staged.dateOrder).toBe('auto');
    expect(buildDataset({ sales: staged }).sales.map((r) => r.date)).toEqual(['2026-04-03', '2026-04-05']);
    expect(buildDataset({ sales: { ...staged, dateOrder: 'MDY' } }).sales.map((r) => r.date)).toEqual(['2026-03-04', '2026-05-04']);
  });
});

describe('EngineCore.setDateOrder', () => {
  const csv = (text: string) => new TextEncoder().encode(text).buffer as ArrayBuffer;

  it('reports the choice and the detected order, and rebuilds the dataset', async () => {
    // Arrange
    const e = new EngineCore();
    const meta = await e.stageFile('sales', 's.csv', csv('Date,SKU,Qty,Total\n03/04/2026,A,1,5\n03/25/2026,A,1,5\n'));
    expect(meta).toMatchObject({ dateOrder: 'auto', detectedDateOrder: 'MDY' });
    const before = await e.analyse(defaultSettings());
    expect(before.result.counts.sales).toBe(2);
    // Act
    const after = await e.setDateOrder('sales', 'DMY');
    const payload = await e.analyse(defaultSettings());
    // Assert
    expect(after).toMatchObject({ dateOrder: 'DMY', detectedDateOrder: 'MDY' });
    expect(payload.result.counts.sales).toBe(1); // 03/25/2026 is not a day-first date
    expect(payload.issues.map((i) => i.code)).toContain('badDate');
  });

  it('ignores an unknown order value and keeps Auto', async () => {
    const e = new EngineCore();
    await e.stageFile('sales', 's.csv', csv('Date,SKU,Qty,Total\n03/04/2026,A,1,5\n'));
    expect((await e.setDateOrder('sales', 'YMD' as DateOrderChoice)).dateOrder).toBe('auto');
  });

  it('says there is nothing to detect when no mapped date has a day/month order', async () => {
    const e = new EngineCore();
    const meta = await e.stageFile('sales', 's.csv', csv('Date,SKU,Qty,Total\n2026-04-03,A,1,5\n'));
    expect(meta.detectedDateOrder).toBeNull();
  });
});
