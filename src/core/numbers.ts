/**
 * Parse money and quantity values as they appear in Malaysian exports:
 * "RM 1,234.50", "1,234", "(12.00)", "12.00-", "-5", "MYR 3.20", "１２３" (full-width).
 * Returns null when the value is not a number (never NaN).
 */
export function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return null;
  if (value instanceof Date) return null;
  let s = String(value).trim();
  // Real numbers are short; refusing long strings also rules out slow regex backtracking.
  if (s === '' || s.length > 64) return null;
  // Full-width digits and punctuation (common in Chinese-locale exports).
  s = s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  s = s.replace(/，/g, ',').replace(/．/g, '.').replace(/－/g, '-');
  s = s.replace(/^(RM|MYR|\$|USD|SGD)\s*/i, '');
  const upper = s.toUpperCase();
  if (upper.endsWith('MYR')) s = s.slice(0, -3).trimEnd();
  else if (upper.endsWith('RM')) s = s.slice(0, -2).trimEnd();
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1).trim();
  }
  if (/-$/.test(s) && !/^-/.test(s)) {
    negative = true;
    s = s.slice(0, -1).trim();
  }
  s = s.replace(/^(RM|MYR)\s*/i, '');
  if (s.startsWith('-')) {
    negative = !negative;
    s = s.slice(1).trim();
  } else if (s.startsWith('+')) {
    s = s.slice(1).trim();
  }
  s = s.replace(/^(RM|MYR)\s*/i, ''); // "-RM 5.00"
  if (s.startsWith('(') && s.endsWith(')')) {
    negative = !negative;
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/[\s\u00A0']/g, '');
  if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(s)) {
    // European style 1.234,56
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d+,\d{1,2}$/.test(s) && !/^\d{1,3},\d{3}$/.test(s)) {
    // Decimal comma "12,5" (but "1,234" stays a thousands separator)
    s = s.replace(',', '.');
  } else {
    if (!/^(\d{1,3}(,\d{3})*|\d+)(\.\d+)?$|^\.\d+$/.test(s)) return null;
    s = s.replace(/,/g, '');
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

/** Parse a percentage like "10%" → 10. Returns null if not a percentage. */
export function parsePercent(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const m = value.trim().match(/^(-?[\d.,]+)\s*%$/);
  if (!m || m[1] === undefined) return null;
  return parseNumber(m[1]);
}

/** Round to sen (2 decimals) avoiding binary float noise. */
export function roundRM(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function sum(values: Iterable<number>): number {
  let s = 0;
  for (const v of values) s += v;
  return s;
}
