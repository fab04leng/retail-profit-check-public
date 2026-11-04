import { describe, expect, it } from 'vitest';
import { EngineCore } from '../../src/worker/core';
import { defaultSettings } from '../../src/rules/settings';

describe('EngineCore (runs in the Web Worker)', () => {
  it('loads the demo, analyses it and returns evidence rows', async () => {
    const e = new EngineCore();
    const { staged, demo } = await e.loadDemo();
    expect(staged.map((s) => s.kind)).toEqual(['sales', 'products', 'invoices', 'payments']);
    expect(staged.every((s) => s.problems.length === 0)).toBe(true);
    expect(demo.cashflow.openingBalance).toBe(20000);
    const p = await e.analyse(defaultSettings());
    expect(p.result.findings.length).toBeGreaterThan(50);
    const f = p.result.findings.find((x) => x.ruleId === 'SUP-01')!;
    const rows = await e.getRows('invoices', f.evidence[0]!.rows);
    expect(rows.headers).toContain('Invoice No');
    expect(rows.rows.every((r) => r.cells[1] === String(f.params.invoiceNo))).toBe(true);
  });

  it('reports friendly error codes and ignores bad row requests', async () => {
    const e = new EngineCore();
    await expect(e.stageFile('sales', 'a.xls', new ArrayBuffer(4))).rejects.toMatchObject({ code: 'xlsNotSupported' });
    expect((await e.getRows('sales', [1, 2])).rows).toEqual([]);
    const enc = new TextEncoder().encode('Date,SKU,Qty,Total\n01/02/2026,A,1,5\n').buffer as ArrayBuffer;
    await e.stageFile('sales', 's.csv', enc);
    expect((await e.getRows('sales', [-1, 0, 2, 2, 99, 1.5])).rows.map((r) => r.row)).toEqual([2]);
  });

  it('caches the dataset between threshold changes and rebuilds after a mapping change', async () => {
    const e = new EngineCore();
    const enc = new TextEncoder().encode('Date,SKU,Qty,Total\n01/02/2026,A,1,5\n').buffer as ArrayBuffer;
    await e.stageFile('sales', 's.csv', enc);
    const a = await e.analyse(defaultSettings());
    expect(a.result.counts.sales).toBe(1);
    await e.setMapping('sales', { date: 0, sku: 1, qty: 2 }); // no amount column any more → file skipped
    const b = await e.analyse(defaultSettings());
    expect(b.result.counts.sales).toBe(0);
  });
});
