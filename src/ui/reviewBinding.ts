/**
 * Ties accountant reviews to the exact data and finding they were made on (QA B01).
 * No React here, so it can be unit-tested directly.
 */
import { findingFingerprint, type Finding } from '../analysis/types';
import { stableJson, textHash } from '../core/hash';
import type { FileKind } from '../core/types';
import type { StagedMeta } from '../worker/protocol';

export type ReviewStatus = 'confirmed' | 'not_issue' | 'needs_info';
export interface Review {
  status: ReviewStatus;
  note: string;
  at: string;
  /** Fingerprint of the finding as it was when reviewed (see findingFingerprint). */
  fp: string;
}

type DatasetMeta = Pick<StagedMeta, 'kind' | 'contentHash' | 'signature' | 'mapping' | 'dateOrder'>;

/**
 * Which saved reviews belong to the loaded files. Bound to each file's exact content, column
 * mapping and day/month order — not its name, layout or row count — so a changed file starts unreviewed.
 */
export function datasetKey(staged: Partial<Record<FileKind, DatasetMeta>>): string {
  const text = Object.values(staged)
    .map((s) => stableJson({ kind: s!.kind, content: s!.contentHash, layout: s!.signature, mapping: s!.mapping, dateOrder: s!.dateOrder }))
    .sort()
    .join('|');
  return textHash(text);
}

/** Only reviews made on a finding identical to the current one (same amount, values and evidence rows) count. */
export function currentReviews(saved: Record<string, Review>, findings: readonly Finding[] | undefined): Record<string, Review> {
  const out: Record<string, Review> = {};
  if (!findings) return out;
  for (const f of findings) {
    const r = saved[f.id];
    if (r && r.fp === findingFingerprint(f)) out[f.id] = r;
  }
  return out;
}

/** Reviews read back from browser storage. Entries without a fingerprint (older versions) are dropped. */
export function sanitizeReviews(v: unknown): Record<string, Review> {
  const out: Record<string, Review> = {};
  if (!v || typeof v !== 'object') return out;
  for (const [k, r] of Object.entries(v as Record<string, unknown>)) {
    if (!r || typeof r !== 'object') continue;
    const s = (r as Review).status;
    if (s !== 'confirmed' && s !== 'not_issue' && s !== 'needs_info') continue;
    const fp = (r as Review).fp;
    if (typeof fp !== 'string' || !fp) continue;
    out[k] = { status: s, note: String((r as Review).note ?? '').slice(0, 2000), at: String((r as Review).at ?? '').slice(0, 10), fp: fp.slice(0, 64) };
  }
  return out;
}

/** A new or changed decision on `finding`. A note written on an older version of the finding is not carried over. */
export function makeReview(finding: Finding, status: ReviewStatus, previous: Review | undefined, note: string | undefined, today: string): Review {
  const fp = findingFingerprint(finding);
  const keepNote = previous?.fp === fp ? previous.note : '';
  return { status, note: (note ?? keepNote ?? '').slice(0, 2000), at: today, fp };
}
