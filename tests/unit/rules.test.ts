import { describe, expect, it } from 'vitest';
import { RULES } from '../../src/rules/rules.config';
import { clampThreshold, defaultThresholds, mergeSettings } from '../../src/rules/settings';

describe('rules config', () => {
  it('has unique ids and complete plain-English text', () => {
    const ids = RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of RULES) {
      expect(r.title.length).toBeGreaterThan(5);
      expect(r.description.length).toBeGreaterThan(20);
      expect(r.why.length).toBeGreaterThan(20);
    }
  });

  it('every threshold default is within its limits', () => {
    for (const r of RULES)
      for (const t of r.thresholds) {
        expect(t.default).toBeGreaterThanOrEqual(t.min);
        expect(t.default).toBeLessThanOrEqual(t.max);
      }
  });

  it('uses the defaults the brief asks for', () => {
    const t = defaultThresholds();
    expect(t.targetMarginPct).toBe(25);
    expect(t.deadStockDays).toBe(90);
    expect(t.duplicateWindowDays).toBe(7);
    expect(t.priceIncreasePct).toBe(5);
  });

  it('clamps out-of-range and non-numeric threshold values', () => {
    expect(clampThreshold('targetMarginPct', 500)).toBe(90);
    expect(clampThreshold('targetMarginPct', -3)).toBe(0);
    expect(clampThreshold('targetMarginPct', Number.NaN)).toBe(25);
  });

  it('merges corrupt stored settings safely', () => {
    expect(mergeSettings('garbage').thresholds.targetMarginPct).toBe(25);
    const m = mergeSettings({ thresholds: { targetMarginPct: 30, deadStockDays: 'x' }, cashflow: { openingBalance: 5000, fixedCosts: [{ amount: 100, dayOfMonth: 99 }, null] } });
    expect(m.thresholds.targetMarginPct).toBe(30);
    expect(m.thresholds.deadStockDays).toBe(90);
    expect(m.cashflow.openingBalance).toBe(5000);
    expect(m.cashflow.fixedCosts).toHaveLength(1);
    expect(m.cashflow.fixedCosts[0]?.dayOfMonth).toBe(31);
  });
});
