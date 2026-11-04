import { describe, expect, it } from 'vitest';
import { DICTS, translate } from '../../src/i18n';
import { formatDate, formatRM, interpolate } from '../../src/i18n/format';
import { RULES } from '../../src/rules/rules.config';

function leaves(obj: unknown, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out.set(key, v);
    else for (const [kk, vv] of leaves(v, key)) out.set(kk, vv);
  }
  return out;
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+(?::\w+)?)\}/g)].map((m) => m[1]).sort();

describe('translations', () => {
  const en = leaves(DICTS.en);
  for (const lang of ['zh', 'ms'] as const) {
    const other = leaves(DICTS[lang]);
    it(`${lang} has exactly the English keys`, () => {
      expect([...other.keys()].sort()).toEqual([...en.keys()].sort());
    });
    it(`${lang} keeps every placeholder`, () => {
      for (const [k, v] of en) expect(placeholders(other.get(k) ?? ''), k).toEqual(placeholders(v));
    });
    it(`${lang} has no empty strings`, () => {
      for (const [k, v] of other) expect(v.trim().length, k).toBeGreaterThan(0);
    });
  }
  it('every rule and threshold has text in every language', () => {
    for (const lang of ['en', 'zh', 'ms'] as const) {
      for (const r of RULES) {
        expect(translate(lang, `ruleText.${r.id}.title`)).not.toBe(`ruleText.${r.id}.title`);
        for (const th of r.thresholds) expect(translate(lang, `thresholdLabels.${th.key}`)).not.toBe(`thresholdLabels.${th.key}`);
      }
    }
  });
  it('uses careful wording (no fraud / confirmed-error claims)', () => {
    for (const lang of ['en', 'zh', 'ms'] as const) {
      const all = [...leaves(DICTS[lang]).values()].join(' ').toLowerCase();
      for (const bad of ['fraud', 'error confirmed', 'you lost', '欺诈', 'penipuan']) expect(all.includes(bad), `${lang}: ${bad}`).toBe(false);
    }
  });
});

describe('formatting', () => {
  it('formats RM, dates and placeholders', () => {
    expect(formatRM(1234.5)).toBe('RM 1,234.50');
    expect(formatRM(-5)).toBe('−RM 5.00');
    expect(formatDate('2026-11-16', 'zh')).toBe('2026年11月16日');
    expect(formatDate('2026-08-16', 'ms')).toBe('16 Ogo 2026');
    expect(interpolate('{a:rm} on {d:date}, {x}', { a: 3, d: '2026-01-02' }, 'en')).toBe('RM 3.00 on 2 Jan 2026, —');
  });
  it('falls back to English, then to the key', () => {
    expect(translate('zh', 'no.such.key')).toBe('no.such.key');
  });
  it('treats file text in params as plain text', () => {
    expect(interpolate('{name}', { name: '<img src=x onerror=alert(1)>' }, 'en')).toBe('<img src=x onerror=alert(1)>');
  });
});
