import { FIELDS, normalizeHeader, type FieldDef } from './fields';
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

/** Score how well a header matches a field. 0 = no match. */
export function scoreHeader(header: string, field: FieldDef): number {
  const h = normalizeHeader(header);
  if (!h) return 0;
  let best = 0;
  for (const syn of field.synonyms) {
    const s = normalizeHeader(syn);
    if (h === s) return 1000;
    if (hasWord(h, s)) best = Math.max(best, s.length * 10 - (h.length - s.length));
  }
  return best;
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

/** Find the header row: the first of the top 15 rows that matches at least 2 known column names. */
export function detectHeaderRow(kind: FileKind, table: Table): number {
  const limit = Math.min(table.length, 15);
  let bestRow = -1;
  let bestHits = 1;
  for (let r = 0; r < limit; r++) {
    const row = table[r] ?? [];
    const hits = Object.keys(autoMap(kind, row)).length;
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
