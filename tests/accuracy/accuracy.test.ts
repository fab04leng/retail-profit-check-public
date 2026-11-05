import { describe, expect, it } from 'vitest';
import { analyseDemo, checkAccuracy } from '../../src/demo/accuracy';
import { generateDemo } from '../../src/demo/generate';

const demo = generateDemo();
const result = analyseDemo(demo);
const checks = checkAccuracy(demo, result);

describe('accuracy on the demo data (answer key in demo/ANSWER_KEY.md)', () => {
  it('prints a report', () => {
    const lines = checks.map((c) => `${c.ruleId.padEnd(7)} ${c.label.padEnd(56)} planted ${String(c.expected.length).padStart(3)}  found ${String(c.found.length).padStart(3)}  missed ${c.missed.length}  false positives ${c.falsePositives.length}${c.falsePositives.length ? ` → ${c.falsePositives.join(', ')}` : ''}`);
    console.log(`\nAccuracy report\n${lines.join('\n')}\n`);
    expect(checks.length).toBeGreaterThan(0);
  });

  it.each(checks.map((c) => [c.ruleId, c]))('%s: every planted issue is found', (_id, c) => {
    expect(c.missed).toEqual([]);
  });

  it.each(checks.map((c) => [c.ruleId, c]))('%s: no false positives', (_id, c) => {
    expect(c.falsePositives).toEqual([]);
  });

  it('matches the planted counts from the brief', () => {
    const n = Object.fromEntries(checks.map((c) => [c.ruleId, c.found.length]));
    expect(n['SUP-01']! + n['SUP-02']!).toBe(6);
    expect(n['PRF-02']).toBe(10);
    expect(n['STK-02']).toBe(25);
    expect(n['SUP-03']).toBe(4);
    expect(n['SUP-04']).toBe(2);
    expect(n['CSH-02']).toBe(1);
  });

  it('headline numbers are consistent with the findings', () => {
    const h = Object.fromEntries(result.summary.map((x) => [x.key, x]));
    const sum = (ids: string[]) => ids.reduce((a, id) => a + (result.findings.find((f) => f.id === id)?.amount ?? 0), 0);
    expect(h.belowCost!.amount).toBeCloseTo(sum(h.belowCost!.findingIds), 2);
    expect(h.duplicates!.count).toBe(6);
    expect(h.slowStock!.amount).toBeGreaterThanOrEqual(result.stock.deadValue);
    expect(h.cashLow!.amount).toBeLessThan(0);
  });
});
