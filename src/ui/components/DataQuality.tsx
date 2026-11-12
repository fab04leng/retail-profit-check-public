import { useI18n } from '../../i18n';
import { FILE_KINDS, type FileKind } from '../../core/types';
import type { AnalysisPayload } from '../../worker/protocol';
import { href } from '../router';
import { AlertIcon } from './Icons';

/** Files every result depends on. Without readable rows in both, there is nothing to report. */
const REQUIRED: FileKind[] = ['sales', 'products'];

export interface Coverage {
  /** Required files with zero usable rows — results would be empty, not "clean". */
  emptyRequired: FileKind[];
  /** Files with rows that could not be used. */
  skipped: { kind: FileKind; errors: number; used: number }[];
  /** Sales whose product has no cost in the product list, so profit leaves them out. */
  noCost: { products: number; revenue: number };
  hasPayments: boolean;
}

export function coverageOf(p: AnalysisPayload): Coverage {
  const used: Record<FileKind, number> = {
    sales: p.result.counts.sales,
    products: p.result.counts.products,
    invoices: p.result.counts.invoiceLines,
    payments: p.result.counts.payments,
  };
  const unknown = p.result.profit.unknownSkus;
  return {
    emptyRequired: REQUIRED.filter((k) => used[k] === 0),
    skipped: FILE_KINDS.filter((k) => p.issueCounts[k].errors > 0).map((k) => ({ kind: k, errors: p.issueCounts[k].errors, used: used[k] })),
    noCost: { products: unknown.length, revenue: unknown.reduce((a, u) => a + u.revenue, 0) },
    hasPayments: p.hasPayments,
  };
}

/**
 * What the numbers are based on. Shown on the health check and on page 1 of the owner report, so a
 * report built from partly unreadable files says so where the numbers are read — not only on Start.
 */
export function DataQuality({ payload, compact = false }: { payload: AnalysisPayload; compact?: boolean }) {
  const { t, num } = useI18n();
  const c = coverageOf(payload);
  const problems = c.emptyRequired.length + c.skipped.length + (c.noCost.products > 0 ? 1 : 0) + (c.hasPayments ? 0 : 1);
  if (!problems) return compact ? null : <p className="muted small" data-testid="data-quality-ok">{t('quality.allUsed')}</p>;
  return (
    <div className={`data-quality ${c.emptyRequired.length ? 'data-quality-block' : ''}`} role="note" data-testid="data-quality">
      <p className="data-quality-title">
        <AlertIcon size={16} /> <strong>{t(c.emptyRequired.length ? 'quality.titleBlocked' : 'quality.title')}</strong>
      </p>
      <ul className="small">
        {c.emptyRequired.map((k) => (
          <li key={`e-${k}`}>{t('quality.emptyRequired', { file: t(`fileNames.${k}`) })}</li>
        ))}
        {c.skipped.map((s) => (
          <li key={`s-${s.kind}`}>{t('quality.skipped', { file: t(`fileNames.${s.kind}`), errors: s.errors, used: s.used })}</li>
        ))}
        {c.noCost.products > 0 ? <li>{t('quality.noCost', { count: c.noCost.products, rm: c.noCost.revenue })}</li> : null}
        {c.hasPayments ? null : <li>{t('quality.noPayments')}</li>}
      </ul>
      {compact ? null : (
        <p className="small no-print">
          <a href={href('start')}>{t('quality.fixOnStart')}</a> · {num(payload.result.counts.sales)} {t('quality.salesRowsUsed')}
        </p>
      )}
    </div>
  );
}
