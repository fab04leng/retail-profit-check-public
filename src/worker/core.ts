/** The engine itself. Runs in the Web Worker, or on the page if workers are unavailable. */
import { runAll } from '../analysis';
import { dateOrderEvidence, isDateOrderChoice, type DateOrder, type DateOrderChoice } from '../core/dates';
import { FIELDS } from '../core/fields';
import { contentHash } from '../core/hash';
import { buildDataset, mappingProblems, stageTable, type StagedFile } from '../core/ingest';
import type { Mapping } from '../core/mapping';
import { ReadError, readTable } from '../core/read';
import { FILE_KINDS, type Cell, type Dataset, type FileKind } from '../core/types';
import { generateDemo } from '../demo/generate';
import type { Settings } from '../rules/settings';
import { ISSUE_LIMIT, type AnalysisPayload, type DemoInfo, type Engine, type SourceRows, type StagedMeta } from './protocol';

export function cellText(c: Cell): string {
  if (c === null || c === undefined) return '';
  if (c instanceof Date) return Number.isNaN(c.getTime()) ? '' : c.toISOString().slice(0, 10);
  return String(c).slice(0, 200);
}

/** How "Auto" reads the file's mapped date columns (month-first only when the values prove it). */
function detectedDateOrder(f: StagedFile): DateOrder | null {
  let dmy = 0;
  let mdy = 0;
  let ambiguous = 0;
  for (const field of FIELDS[f.kind]) {
    const col = f.mapping[field.key];
    if (field.type !== 'date' || col === undefined) continue;
    const ev = dateOrderEvidence(f.table.slice(f.headerRow + 1).map((row) => row?.[col]));
    dmy += ev.dmy;
    mdy += ev.mdy;
    ambiguous += ev.ambiguous;
  }
  if (!dmy && !mdy && !ambiguous) return null;
  return mdy > 0 && dmy === 0 ? 'MDY' : 'DMY';
}

function meta(f: StagedFile): StagedMeta {
  const preview: string[][] = [];
  for (let r = f.headerRow + 1; r < f.table.length && preview.length < 5; r++) {
    const row = f.table[r] ?? [];
    if (row.every((c) => cellText(c).trim() === '')) continue;
    preview.push(f.headers.map((_, i) => cellText(row[i])));
  }
  return {
    kind: f.kind,
    fileName: f.fileName,
    headers: f.headers.map(cellText),
    headerRow: f.headerRow,
    signature: f.signature,
    mapping: { ...f.mapping },
    remembered: f.remembered,
    dataRowCount: f.dataRowCount,
    preview,
    problems: mappingProblems(f),
    dateOrder: f.dateOrder,
    detectedDateOrder: detectedDateOrder(f),
    contentHash: f.contentHash ?? '',
  };
}

export class EngineCore implements Engine {
  private files: Partial<Record<FileKind, StagedFile>> = {};
  private dataset: Dataset | null = null;

  async stageFile(kind: FileKind, fileName: string, buffer: ArrayBuffer, remembered?: unknown): Promise<StagedMeta> {
    const hash = await contentHash(buffer); // before reading: some readers may detach the buffer
    const table = await readTable(fileName, buffer);
    const f = stageTable(kind, fileName, table, remembered);
    f.contentHash = hash;
    this.files[kind] = f;
    this.dataset = null;
    return meta(f);
  }

  async loadDemo(): Promise<{ staged: StagedMeta[]; demo: DemoInfo }> {
    const d = generateDemo();
    this.files = {};
    for (const k of FILE_KINDS) this.files[k] = { ...stageTable(k, `demo-${k}.csv`, d.tables[k]), contentHash: 'demo' };
    this.dataset = null;
    return { staged: FILE_KINDS.map((k) => meta(this.files[k]!)), demo: { shopName: d.shopName, cashflow: d.cashflow } };
  }

  async setMapping(kind: FileKind, mapping: Mapping): Promise<StagedMeta> {
    const f = this.files[kind];
    if (!f) throw new ReadError('emptyFile');
    f.mapping = { ...mapping };
    f.remembered = false;
    this.dataset = null;
    return meta(f);
  }

  async setDateOrder(kind: FileKind, order: DateOrderChoice): Promise<StagedMeta> {
    const f = this.files[kind];
    if (!f) throw new ReadError('emptyFile');
    f.dateOrder = isDateOrderChoice(order) ? order : 'auto';
    this.dataset = null;
    return meta(f);
  }

  async remove(kind: FileKind): Promise<void> {
    delete this.files[kind];
    this.dataset = null;
  }

  async clear(): Promise<void> {
    this.files = {};
    this.dataset = null;
  }

  async analyse(settings: Settings): Promise<AnalysisPayload> {
    const start = Date.now();
    if (!this.dataset) this.dataset = buildDataset(this.files);
    const ds = this.dataset;
    const result = runAll(ds, settings);
    const issueCounts = Object.fromEntries(FILE_KINDS.map((k) => [k, { errors: 0, warnings: 0 }])) as AnalysisPayload['issueCounts'];
    const issues = [];
    const perFile: Record<string, number> = {};
    for (const i of ds.issues) {
      const c = issueCounts[i.file];
      if (i.level === 'error') c.errors++;
      else c.warnings++;
      perFile[i.file] = (perFile[i.file] ?? 0) + 1;
      if (perFile[i.file]! <= ISSUE_LIMIT) issues.push(i);
    }
    return { result, issues, issueCounts, hasPayments: ds.hasPayments, ms: Date.now() - start };
  }

  async getRows(kind: FileKind, rows: number[]): Promise<SourceRows> {
    const f = this.files[kind];
    if (!f) return { kind, headers: [], rows: [] };
    const out = [...new Set(rows)]
      .filter((r) => Number.isInteger(r) && r >= 1 && r <= f.table.length)
      .sort((a, b) => a - b)
      .slice(0, 200)
      .map((r) => ({ row: r, cells: f.headers.map((_, i) => cellText(f.table[r - 1]?.[i])) }));
    return { kind, headers: f.headers.map(cellText), rows: out };
  }
}
