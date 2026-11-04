import { describe, expect, it } from 'vitest';
import { runAll } from '../../src/analysis';
import { buildDataset, stageTable } from '../../src/core/ingest';
import { parseCsvText } from '../../src/core/read';
import { defaultSettings } from '../../src/rules/settings';
import { bigSalesCsv } from './bigfile';

describe('performance with 100,000 sales rows', () => {
  it('parses, normalises and analyses within budget', () => {
    const { csv, demo } = bigSalesCsv(100_000);
    const t0 = performance.now();
    const table = parseCsvText(csv);
    const t1 = performance.now();
    const ds = buildDataset({
      sales: stageTable('sales', 'big.csv', table),
      products: stageTable('products', 'p.csv', demo.tables.products),
      invoices: stageTable('invoices', 'i.csv', demo.tables.invoices),
      payments: stageTable('payments', 'pay.csv', demo.tables.payments),
    });
    const t2 = performance.now();
    const r = runAll(ds, defaultSettings());
    const t3 = performance.now();
    console.log(`100k rows (${(csv.length / 1e6).toFixed(1)} MB): parse ${(t1 - t0).toFixed(0)} ms, normalise ${(t2 - t1).toFixed(0)} ms, analyse ${(t3 - t2).toFixed(0)} ms`);
    expect(ds.sales).toHaveLength(100_000);
    expect(r.profit.products.length).toBeGreaterThan(200);
    // Budget for a mid-range laptop; this machine is typically 3–5× faster. Runs in a Web Worker in the app.
    expect(t3 - t0).toBeLessThan(15_000);
    // Re-running analyses after a threshold change must be quick (dataset is cached in the worker).
    const t4 = performance.now();
    runAll(ds, { ...defaultSettings(), thresholds: { ...defaultSettings().thresholds, targetMarginPct: 30 } });
    expect(performance.now() - t4).toBeLessThan(3_000);
  });
});
