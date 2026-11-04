import { describe, expect, it } from 'vitest';
import { generateDemo, DEMO_START, DEMO_END } from '../../src/demo/generate';
import { SUPPLIERS, OUTLETS } from '../../src/demo/catalog';
import { buildDataset, mappingProblems, stageTable } from '../../src/core/ingest';
import { FILE_KINDS } from '../../src/core/types';

const demo = generateDemo();

describe('demo data generator', () => {
  it('is deterministic', () => {
    const again = generateDemo();
    expect(JSON.stringify(again.tables.invoices)).toBe(JSON.stringify(demo.tables.invoices));
    expect(again.tables.sales.length).toBe(demo.tables.sales.length);
    expect(again.planted).toEqual(demo.planted);
  });

  it('matches the brief: ~250 SKUs, ~30 suppliers, 12 months, 2 outlets', () => {
    expect(demo.tables.products.length - 1).toBeGreaterThanOrEqual(240);
    expect(demo.tables.products.length - 1).toBeLessThanOrEqual(260);
    expect(SUPPLIERS).toHaveLength(30);
    expect(OUTLETS).toHaveLength(2);
    expect(DEMO_START).toBe('2025-11-03');
    expect(DEMO_END).toBe('2026-11-01');
    const outlets = new Set(demo.tables.sales.slice(1).map((r) => r[9]));
    expect([...outlets].sort()).toEqual(['Bayan Lepas', 'Jelutong']);
  });

  it('plants the issues listed in the answer key', () => {
    const p = demo.planted;
    expect(p.duplicateSameNumber).toHaveLength(3);
    expect(p.duplicateSameAmount).toHaveLength(3);
    for (const d of p.duplicateSameAmount) expect(d.invoiceNos[0]).not.toBe(d.invoiceNos[1]);
    expect(p.belowCost).toHaveLength(10);
    expect(p.deadStock).toHaveLength(25);
    expect(p.priceJumps).toHaveLength(4);
    expect(p.overpaid).toHaveLength(2);
    expect(p.unmatchedPayments).toHaveLength(2);
  });

  it('produces files that load through the normal upload pipeline without errors', () => {
    const staged = Object.fromEntries(FILE_KINDS.map((k) => [k, stageTable(k, `${k}.csv`, demo.tables[k])]));
    for (const k of FILE_KINDS) expect(mappingProblems(staged[k]!)).toEqual([]);
    const ds = buildDataset(staged);
    expect(ds.issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(ds.sales.length).toBe(demo.tables.sales.length - 1);
    expect(ds.hasPayments).toBe(true);
  });

  it('shows festive and weekend patterns', () => {
    const byDate = new Map<string, number>();
    for (const r of demo.tables.sales.slice(1)) byDate.set(r[0]!, (byDate.get(r[0]!) ?? 0) + Number(r[8]));
    const avg = (dates: string[]) => dates.reduce((a, d) => a + (byDate.get(d) ?? 0), 0) / dates.length;
    // Two weeks before CNY (17 Feb 2026) vs a quiet week in April.
    expect(avg(['09/02/2026', '10/02/2026', '11/02/2026', '12/02/2026'])).toBeGreaterThan(1.3 * avg(['13/04/2026', '14/04/2026', '15/04/2026', '16/04/2026']));
    // Saturday vs Tuesday.
    expect(avg(['18/04/2026', '25/04/2026'])).toBeGreaterThan(avg(['14/04/2026', '21/04/2026']));
  });
});
