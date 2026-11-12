import { useI18n } from '../../i18n';
import { href } from '../router';
import { useApp } from '../state';
import { FindingCard } from '../components/FindingCard';
import { Money, NoData, PageHeader } from '../components/common';
import { AlertIcon } from '../components/Icons';
import { DataQuality } from '../components/DataQuality';

export function HealthPage() {
  const { t } = useI18n();
  const { payload, reviews } = useApp();
  if (!payload) return <NoData />;
  const r = payload.result;
  const reviewed = r.findings.filter((f) => reviews[f.id]).length;
  const confirmed = r.findings.filter((f) => reviews[f.id]?.status === 'confirmed').length;
  const top = r.findings
    .filter((f) => !f.estimate && f.severity === 'high' && f.amountKind !== 'marginGap')
    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
    .slice(0, 5);
  return (
    <>
      <PageHeader title={t('health.title')} intro={t('health.intro')}>
        <a className="btn" href={href('report')}>{t('nav.report')}</a>
      </PageHeader>
      {r.period ? <p className="muted small">{t('common.period', { from: r.period.from, to: r.period.to })} · {t('common.asOf', { date: r.period.to })}</p> : null}
      <DataQuality payload={payload} compact />
      <div className="headlines">
        {r.summary.map((h) => (
          <article key={h.key} className={`headline card ${h.key === 'cashLow' && h.count > 0 ? 'headline-bad' : h.key !== 'cashLow' && h.amount !== 0 ? 'headline-warn' : ''}`} data-testid={`headline-${h.key}`}>
            <h2 className="headline-title">{t(`headlines.${h.key}.title`)}</h2>
            <div className="headline-amount">
              <Money value={h.amount} />
              {h.estimate ? <span className="chip chip-est">{t('common.estimate')}</span> : null}
              {h.key === 'cashLow' && h.count > 0 ? <span className="chip chip-critical"><AlertIcon size={14} /> {t('cashflow.belowMin')}</span> : null}
            </div>
            <p className="small">{t(`headlines.${h.key}.desc`, { count: h.count, ...h.params })}</p>
            <div className="headline-links">
              {h.findingIds.length ? <a href={href('findings', { headline: h.key })}>{t('common.seeEvidence')} ({h.findingIds.length})</a> : null}
              <a href={href(h.page)}>{t(`nav.${h.page}`)} →</a>
            </div>
          </article>
        ))}
      </div>
      <section className="card">
        <p>{t('health.profitLine', { gp: r.profit.totals.grossProfit, rev: r.profit.totals.revenue, margin: r.profit.totals.marginPct ?? 0 })}</p>
        <p className="muted small">{t('health.reviewProgress', { reviewed, total: r.findings.length, confirmed })}</p>
        <p className="muted small">{t('health.method')}</p>
      </section>
      <h2 className="section-title">{t('health.topFindings')}</h2>
      <div className="finding-list">
        {top.map((f) => <FindingCard key={f.id} finding={f} />)}
      </div>
    </>
  );
}
