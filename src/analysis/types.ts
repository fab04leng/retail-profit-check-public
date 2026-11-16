import { stableJson, textHash } from '../core/hash';
import type { FileKind } from '../core/types';
import type { RuleId } from '../rules/rules.config';

export interface Evidence {
  file: FileKind;
  /** Spreadsheet row numbers in that file. */
  rows: number[];
}

/** What an RM amount on a finding means. All are arithmetic on the input rows unless `estimate`. */
export type AmountKind =
  | 'belowCost' // cost of goods sold − revenue on these rows
  | 'marginGap' // profit needed to reach the target margin
  | 'stockValue' // qty on hand × unit cost
  | 'invoiceTotal' // total of the possible duplicate invoice
  | 'priceImpact' // (new price − previous price) × quantity on the newer invoice
  | 'overpaid' // payments matched − invoice total
  | 'payment' // amount of the unmatched payment
  | 'shortfall'; // minimum balance − estimated closing balance

export interface Finding {
  /** Stable id: `${ruleId}:${key}` — used to remember accountant reviews. */
  id: string;
  ruleId: RuleId;
  severity: 'high' | 'medium' | 'low';
  /** Main thing the finding is about (product, supplier + invoice, week). Text from the file. */
  subject: string;
  /** Values for the translated message template `findings.<ruleId>`. */
  params: Record<string, string | number>;
  amount?: number;
  amountKind?: AmountKind;
  /** True only for forecasts. */
  estimate?: boolean;
  evidence: Evidence[];
}

export function findingId(ruleId: RuleId, key: string): string {
  return `${ruleId}:${key}`;
}

/**
 * What an accountant's decision on a finding is bound to: the rule, subject, message values,
 * amount and evidence rows. If any of these change, an earlier review no longer applies.
 */
export function findingFingerprint(f: Finding): string {
  return textHash(
    stableJson({
      ruleId: f.ruleId,
      subject: f.subject,
      params: f.params,
      amount: f.amount,
      amountKind: f.amountKind,
      estimate: f.estimate ?? false,
      evidence: f.evidence.map((e) => ({ file: e.file, rows: [...e.rows].sort((a, b) => a - b) })),
    }),
  );
}
