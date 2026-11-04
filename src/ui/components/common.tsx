import { useI18n } from '../../i18n';
import { href } from '../router';

export function Money({ value, className }: { value: number | null | undefined; className?: string }) {
  const { rm } = useI18n();
  if (value === null || value === undefined) return <span className={className}>—</span>;
  return <span className={`num ${value < -0.004 ? 'neg' : ''} ${className ?? ''}`}>{rm(value)}</span>;
}

export function Pct({ value }: { value: number | null | undefined }) {
  const { pct } = useI18n();
  return <span className="num">{value === null || value === undefined ? '—' : pct(value)}</span>;
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: 'bad' | 'warn' | 'ok' }) {
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub ? <div className="stat-sub">{sub}</div> : null}
    </div>
  );
}

export function NoData() {
  const { t } = useI18n();
  return (
    <div className="card empty">
      <p>{t('common.noData')}</p>
      <a className="btn btn-primary" href={href('start')}>
        {t('common.goToStart')}
      </a>
    </div>
  );
}

export function PageHeader({ title, intro, children }: { title: string; intro?: string; children?: React.ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1 tabIndex={-1} id="page-title">
          {title}
        </h1>
        {intro ? <p className="intro">{intro}</p> : null}
      </div>
      {children ? <div className="page-actions">{children}</div> : null}
    </div>
  );
}

/** Horizontal scroll wrapper so wide tables never widen the page. */
export function TableWrap({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="table-wrap" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}
