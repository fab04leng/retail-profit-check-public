import { parseDate } from './dates';
import { FIELDS, normalizeHeader, type FieldDef } from './fields';
import { parseNumber } from './numbers';
import type { Cell, FileKind, Table } from './types';

/** field key → column index (or undefined if not mapped) */
export type Mapping = Record<string, number | undefined>;

export interface MappingProblem {
  code: 'missingRequired' | 'missingOneOf' | 'duplicateColumn';
  fields: string[];
}

const CJK = /[㐀-鿿]/;

function hasWord(haystack: string, needle: string): boolean {
  if (CJK.test(needle)) return haystack.includes(needle);
  return (` ${haystack} `).includes(` ${needle} `);
}

// Tax wording in headers. "Excluding" is tested first: "tidak termasuk" contains "termasuk", 不含 contains 含.
const TAX = /\b(sst|gst|tax|cukai)\b|税|稅/;
const EXCL_TAX = /\b(excl|exclusive|excluding|exclude|without|before|tidak termasuk|sebelum|pre)\b|不含|未含|税前|稅前/;
const INCL_TAX = /\b(incl|inclusive|including|include|with|after|termasuk|selepas)\b|含税|含稅|税后|稅後/;
// A total-like word in a header, which makes it a poor match for a per-unit field.
const TOTAL_WORD = /\b(total|subtotal|jumlah|amount|amaun)\b|合计|总额|金额|小计/;
// Net vs gross wording, for the line total: "Net Total" beats "Total", "Gross Sales" loses.
const NET_WORD = /\b(net|nett|bersih|after discount|selepas diskaun)\b|净额|淨額|净/;
const GROSS_WORD = /\b(gross|kasar|before discount|sebelum diskaun)\b|毛额|總額前/;
const TAX_BONUS = 25;
const NET_BONUS = 20;
const UNIT_PENALTY = 30;

export type TaxKind = 'excl' | 'incl' | 'taxOnly' | null;

/** What a header says about tax: an amount before tax, after tax, the tax itself, or nothing. */
export function headerTaxKind(header: string): TaxKind {
  const h = normalizeHeader(header);
  if (!TAX.test(h)) return null;
  if (EXCL_TAX.test(h)) return 'excl';
  if (INCL_TAX.test(h)) return 'incl';
  return 'taxOnly';
}

/** Score how well a header matches a field. 0 = no match. */
export function scoreHeader(header: string, field: FieldDef): number {
  const h = normalizeHeader(header);
  if (!h) return 0;
  const tax = headerTaxKind(header);
  // "SST (RM)", "SST 10%", "Tax amount": the tax itself is never one of our columns.
  if (tax === 'taxOnly' && field.type === 'number') return 0;
  let best = 0;
  for (const syn of field.synonyms) {
    const s = normalizeHeader(syn);
    if (h === s) best = 1000;
    else if (hasWord(h, s)) best = Math.max(best, s.length * 10 - (h.length - s.length));
  }
  if (best <= 0) return 0;
  // Two exact matches such as "Total" and "Net Total": the amount after discount wins.
  if (field.key === 'total') best += NET_WORD.test(h) ? NET_BONUS : GROSS_WORD.test(h) ? -NET_BONUS : 0;
  if (field.tax && (tax === 'excl' || tax === 'incl')) best += tax === field.tax ? TAX_BONUS : -TAX_BONUS;
  if ((field.key === 'unitPrice' || field.key === 'unitCost') && TOTAL_WORD.test(h)) best -= UNIT_PENALTY;
  return Math.max(1, best);
}

function filled(c: Cell): boolean {
  return c !== null && c !== undefined && String(c).trim() !== '';
}

/**
 * A group header row above the real header, as produced by merged cells, e.g.
 *   Transaction | | | Item | | Amount (RM) | |
 *   Date | Receipt | Outlet | Code | Description | Price | Disc | Net
 * It has at least two labels, fewer filled cells than the row below, and no numbers or dates.
 */
export function isGroupRow(group: Cell[] | undefined, below: Cell[] | undefined): boolean {
  if (!group || !below) return false;
  const labels = group.filter(filled);
  if (labels.length < 2 || labels.length >= below.filter(filled).length) return false;
  return labels.every((c) => typeof c === 'string' && parseNumber(c) === null && parseDate(c) === null);
}

/**
 * Header labels for row `r`. When the row above is a group header (merged cells), a column whose
 * own header means nothing to us is labelled "<group> <header>" ("Amount (RM) Net", "Item Code").
 */
export function headerLabels(kind: FileKind, table: Table, r: number): Cell[] {
  const row = table[r] ?? [];
  const group = r > 0 ? table[r - 1] : undefined;
  if (!isGroupRow(group, row)) return row;
  const width = Math.max(row.length, group!.length);
  const out: Cell[] = [];
  let carry = '';
  for (let c = 0; c < width; c++) {
    const g = group![c];
    if (filled(g)) carry = String(g).trim();
    const sub = filled(row[c]) ? String(row[c]).trim() : '';
    if (!sub) out.push(carry || row[c]);
    else if (!carry || FIELDS[kind].some((f) => scoreHeader(sub, f) > 0)) out.push(row[c]);
    else out.push(`${carry} ${sub}`);
  }
  return out;
}

const mappedCount = (m: Mapping) => Object.values(m).filter((v) => v !== undefined).length;

/** Labels to use for the header row: with the group row folded in only when that maps more columns. */
export function bestHeaderLabels(kind: FileKind, table: Table, r: number): Cell[] {
  const plain = table[r] ?? [];
  const combined = headerLabels(kind, table, r);
  if (combined === plain) return plain;
  const pm = autoMap(kind, plain);
  const cm = autoMap(kind, combined);
  const better = validateMapping(kind, cm).length < validateMapping(kind, pm).length || mappedCount(cm) > mappedCount(pm);
  return better ? combined : plain;
}

/** Auto-detect a mapping. Each column is used for at most one field; best scores win. */
export function autoMap(kind: FileKind, headers: Cell[]): Mapping {
  const fields = FIELDS[kind];
  const pairs: { field: string; col: number; score: number }[] = [];
  headers.forEach((h, col) => {
    for (const f of fields) {
      const score = scoreHeader(String(h ?? ''), f);
      if (score > 0) pairs.push({ field: f.key, col, score });
    }
  });
  pairs.sort((a, b) => b.score - a.score || a.col - b.col);
  const mapping: Mapping = {};
  const usedCols = new Set<number>();
  for (const p of pairs) {
    if (mapping[p.field] !== undefined || usedCols.has(p.col)) continue;
    mapping[p.field] = p.col;
    usedCols.add(p.col);
  }
  return mapping;
}

/**
 * Find the header row: of the top 15 rows, the one that matches the most known column names
 * (at least 2; the first such row wins ties). A group row of merged cells above it is folded in.
 */
export function detectHeaderRow(kind: FileKind, table: Table): number {
  const limit = Math.min(table.length, 15);
  let bestRow = -1;
  let bestHits = 1;
  for (let r = 0; r < limit; r++) {
    const hits = mappedCount(autoMap(kind, bestHeaderLabels(kind, table, r)));
    if (hits > bestHits) {
      bestHits = hits;
      bestRow = r;
    }
  }
  if (bestRow >= 0) return bestRow;
  for (let r = 0; r < table.length; r++) if ((table[r] ?? []).some((c) => String(c ?? '').trim() !== '')) return r;
  return 0;
}

export function validateMapping(kind: FileKind, mapping: Mapping): MappingProblem[] {
  const problems: MappingProblem[] = [];
  const fields = FIELDS[kind];
  const missing = fields.filter((f) => f.required && mapping[f.key] === undefined).map((f) => f.key);
  if (missing.length) problems.push({ code: 'missingRequired', fields: missing });
  const groups = new Map<string, string[]>();
  for (const f of fields) if (f.oneOf) groups.set(f.oneOf, [...(groups.get(f.oneOf) ?? []), f.key]);
  for (const keys of groups.values()) {
    if (!keys.some((k) => mapping[k] !== undefined)) problems.push({ code: 'missingOneOf', fields: keys });
  }
  const byCol = new Map<number, string[]>();
  for (const [k, col] of Object.entries(mapping)) if (col !== undefined) byCol.set(col, [...(byCol.get(col) ?? []), k]);
  for (const keys of byCol.values()) if (keys.length > 1) problems.push({ code: 'duplicateColumn', fields: keys });
  return problems;
}

/** Stable signature of a file layout, for remembering mappings. FNV-1a over normalised headers. */
export function layoutSignature(kind: FileKind, headers: Cell[]): string {
  const text = `${kind}|${headers.map(normalizeHeader).join('|')}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Keep only entries that point at real columns (stored mappings can be stale). */
export function sanitizeMapping(kind: FileKind, mapping: unknown, columnCount: number): Mapping | null {
  if (!mapping || typeof mapping !== 'object') return null;
  const out: Mapping = {};
  const keys = new Set(FIELDS[kind].map((f) => f.key));
  for (const [k, v] of Object.entries(mapping as Record<string, unknown>)) {
    if (keys.has(k) && typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < columnCount) out[k] = v;
  }
  return out;
}
