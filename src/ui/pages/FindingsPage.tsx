import { useId, useMemo, useState } from 'react';
import { useI18n } from '../../i18n';
import { RULES_BY_ID, type RuleArea } from '../../rules/rules.config';
import type { Route } from '../router';
import { useApp } from '../state';
import { FindingList } from '../components/FindingCard';
import { NoData, PageHeader } from '../components/common';

const AREAS: RuleArea[] = ['profit', 'stock', 'suppliers', 'cashflow'];

export function FindingsPage({ route }: { route: Route }) {
  const { t } = useI18n();
  const { payload, reviews } = useApp();
  const [area, setArea] = useState<RuleArea | 'all'>('all');
  const [status, setStatus] = useState<'all' | 'unreviewed' | 'confirmed' | 'not_issue' | 'needs_info'>('all');
  const a = useId();
  const s = useId();
  const headline = route.query.get('headline');
  const ids = useMemo(() => {
    const h = payload?.result.summary.find((x) => x.key === headline);
    return h ? new Set(h.findingIds) : null;
  }, [payload, headline]);
  if (!payload) return <NoData />;
  const list = payload.result.findings.filter((f) => {
    if (ids && !ids.has(f.id)) return false;
    if (area !== 'all' && RULES_BY_ID[f.ruleId].area !== area) return false;
    const r = reviews[f.id]?.status ?? 'unreviewed';
    return status === 'all' || r === status;
  });
  return (
    <>
      <PageHeader title={headline && ids ? t(`headlines.${headline}.title`) : t('findings.title')} intro={t('findings.intro')} />
      <div className="filters">
        <div className="field">
          <label htmlFor={a}>{t('findings.filterArea')}</label>
          <select id={a} value={area} onChange={(e) => setArea(e.target.value as RuleArea | 'all')}>
            <option value="all">{t('common.all')}</option>
            {AREAS.map((x) => <option key={x} value={x}>{t(`findings.areas.${x}`)}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor={s}>{t('findings.filterStatus')}</label>
          <select id={s} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="all">{t('common.all')}</option>
            {(['unreviewed', 'confirmed', 'not_issue', 'needs_info'] as const).map((x) => <option key={x} value={x}>{t(`review.${x}`)}</option>)}
          </select>
        </div>
        {ids ? <a className="btn btn-small" href="#/findings">{t('common.all')}</a> : null}
        <span className="muted" aria-live="polite">{t('findings.count', { n: list.length })}</span>
      </div>
      {list.length ? <FindingList findings={list} limit={30} /> : <p className="muted">{t('findings.empty')}</p>}
    </>
  );
}
