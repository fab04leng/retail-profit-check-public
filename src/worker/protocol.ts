import type { AnalysisResult } from '../analysis';
import type { Mapping, MappingProblem } from '../core/mapping';
import type { FileKind, RowIssue } from '../core/types';
import type { Settings } from '../rules/settings';
import type { FixedCost } from '../rules/settings';

export interface StagedMeta {
  kind: FileKind;
  fileName: string;
  headers: string[];
  headerRow: number;
  signature: string;
  mapping: Mapping;
  remembered: boolean;
  dataRowCount: number;
  /** First data rows as text, for the mapping wizard. */
  preview: string[][];
  problems: MappingProblem[];
}

export interface DemoInfo {
  shopName: string;
  cashflow: { openingBalance: number; fixedCosts: FixedCost[] };
}

export interface AnalysisPayload {
  result: AnalysisResult;
  /** Row issues, at most ISSUE_LIMIT per file (counts are complete). */
  issues: RowIssue[];
  issueCounts: Record<FileKind, { errors: number; warnings: number }>;
  hasPayments: boolean;
  ms: number;
}

export interface SourceRows {
  kind: FileKind;
  headers: string[];
  rows: { row: number; cells: string[] }[];
}

export const ISSUE_LIMIT = 300;

export interface Engine {
  stageFile(kind: FileKind, fileName: string, buffer: ArrayBuffer, remembered?: unknown): Promise<StagedMeta>;
  loadDemo(): Promise<{ staged: StagedMeta[]; demo: DemoInfo }>;
  setMapping(kind: FileKind, mapping: Mapping): Promise<StagedMeta>;
  remove(kind: FileKind): Promise<void>;
  clear(): Promise<void>;
  analyse(settings: Settings): Promise<AnalysisPayload>;
  getRows(kind: FileKind, rows: number[]): Promise<SourceRows>;
}

export type Request =
  | { id: number; op: 'stageFile'; args: [FileKind, string, ArrayBuffer, unknown] }
  | { id: number; op: 'loadDemo'; args: [] }
  | { id: number; op: 'setMapping'; args: [FileKind, Mapping] }
  | { id: number; op: 'remove'; args: [FileKind] }
  | { id: number; op: 'clear'; args: [] }
  | { id: number; op: 'analyse'; args: [Settings] }
  | { id: number; op: 'getRows'; args: [FileKind, number[]] };

export type Response = { id: number; ok: true; value: unknown } | { id: number; ok: false; error: { code: string; message: string } };
