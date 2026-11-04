import { useState } from 'react';
import type { Finding } from '../../analysis/types';
import { useI18n } from '../../i18n';
import { RULES, RULES_BY_ID, type RuleArea } from '../../rules/rules.config';
import { useApp } from '../state';
import { findingMessage } from '../components/FindingCard';
import { Money, NoData } from '../components/common';
import { PrintIcon } from '../components/Icons';
import { exportFindingsCsv, exportFindingsXlsx } from '../exportFindings';

const AREAS: RuleArea[] = ['profit', 'stock', 'suppliers', 'cashflow'];

function rowsText(f: Finding, t: ReturnType<typeof useI18n>['t']): string {
  return f.evidence
    .filter((e) => e.rows.length)
    .map((e) => t('report.evidenceRows', { file: t(`fileNames.${e.file}`), rows: `${e.rows.slice(0, 25).join(', ')}${e.rows.length > 25 ? ` … (+${e.rows.length - 25})` : ''}` }))
    .join(' · ');
}

export function ReportPage() {
  const i18n = useI18n();
  const { t, date, num } = i18n;
  const { payload, reviews, isDemo, demoShop, settings } = useApp();
  const [confirmedOnly, setConfirmedOnly] = useState(false);
  if (!payload) return <NoData />;
  const r = payload.result;
  const today = new Date().toISOString().slice(0, 10);
  const counts = { confirmed: 0, notIssue: 0, needsInfo: 0, unreviewed: 0, confirmedAmount: 0 };
  for (const f of r.findings) {
    const s = reviews[f.id]?.status;
    if (s === 'confirmed') {
      counts.confirmed++;
      if (!f.estimate && f.amountKind !== 'marginGap') counts.confirmedAmount += f.amount ?? 0;
    } else if (s === 'not_issue') counts.notIssue++;
    else if (s === 'needs_info') counts.needsInfo++;
    else counts.unreviewed++;
  }
  const h = Object.fromEntries(r.summary.map((x) => [x.key, x]));
  const steps = [
    (h.duplicates?.count ?? 0) + (h.payments?.count ?? 0) > 0 ? t('report.step1') : null,
    (h.belowCost?.count ?? 0) > 0 ? t('report.step2') : null,
    r.stock.deadCount > 0 ? t('report.step3') : null,
    (h.cashLow?.count ?? 0) > 0 ? t('report.step4') : null,
  ].filter(Boolean) as string[];
  const appendix = r.findings.filter((f) => !confirmedOnly || reviews[f.id]?.status === 'confirmed');
  return (
    <div className="report">
      <div className="report-tools no-print">
        <button className="btn btn-primary" onClick={() => globalThis.print?.()} data-testid="print">
          <PrintIcon size={16} /> {t('common.print')}
        </button>
        <button className="btn" onClick={() => exportFindingsCsv(r.findings, reviews, i18n)}>{t('common.exportCsv')}</button>
        <button className="btn" onClick={() => void exportFindingsXlsx(r.findings, reviews, i18n)}>{t('common.exportXlsx')}</button>
        <label className="check">
          <input type="checkbox" checked={confirmedOnly} onChange={(e) => setConfirmedOnly(e.target.checked)} /> {t('report.confirmedOnly')}
        </label>
        <p className="muted small">{t('report.printHint')}</p>
      </div>

      <section className="report-page" aria-labelledby="report-title">
        <header className="report-head">
          <div>
            <p className="eyebrow">{t('app.name')} · {t('report.subtitle')}</p>
            <h1 id="report-title">{isDemo && demoShop ? demoShop : t('report.title')}</h1>
            {r.period ? <p className="muted">{t('report.prepared', { date: today, from: r.period.from, to: r.period.to })}</p> : null}
          </div>
        </header>
        {isDemo ? <p className="demo-note">{t('app.demoBanner', { shop: demoShop ?? '' })}</p> : null}
        <h2>{t('report.keyNumbers')}</h2>
        <table className="report-key">
          <tbody>
            <tr>
              <th scope="row">{t('common.grossProfit')}</th>
              <td className="num"><Money value={r.profit.totals.grossProfit} /></td>
              <td>{t('health.profitLine', { gp: r.profit.totals.grossProfit, rev: r.profit.totals.revenue, margin: r.profit.totals.marginPct ?? 0 })}</td>
            </tr>
            {r.summary.map((x) => (
              <tr key={x.key}>
                <th scope="row">{t(`headlines.${x.key}.title`)}{x.estimate ? ` (${t('common.estimate')})` : ''}</th>
                <td className="num"><Money value={x.amount} /></td>
                <td>{t(`headlines.${x.key}.desc`, { count: x.count, ...x.params })}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2>{t('report.reviewStatus')}</h2>
        <p>{t('report.reviewSummary', counts)}</p>
        <p className="muted small">{t('report.reviewNote')}</p>
        {steps.length ? (
          <>
            <h2>{t('report.nextSteps')}</h2>
            <ol className="steps">{steps.map((s) => <li key={s}>{s}</li>)}</ol>
          </>
        ) : null}
        <p className="disclaimer-box">{t('app.disclaimer')}</p>
      </section>

      <section className="report-appendix" aria-labelledby="appendix-title">
        <h2 id="appendix-title">{t('report.appendix')}</h2>
        <p className="muted small">{t('report.appendixIntro')}</p>
        {AREAS.map((area) => {
          const list = appendix.filter((f) => RULES_BY_ID[f.ruleId].area === area);
          if (!list.length) return null;
          return (
            <div key={area} className="appendix-area">
              <h3>{t(`findings.areas.${area}`)} ({num(list.length)})</h3>
              <table className="data small appendix-table">
                <thead>
                  <tr>
                    <th scope="col">{t('common.ruleFired', { id: '' }).trim()}</th>
                    <th scope="col">{t('common.product')} / {t('common.supplier')}</th>
                    <th scope="col">{t('common.amount')}</th>
                    <th scope="col">{t('review.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((f) => {
                    const rv = reviews[f.id];
                    return (
                      <tr key={f.id}>
                        <td>{f.ruleId}</td>
                        <td>
                          <strong>{f.subject}</strong>
                          <div>{findingMessage(f, t, date)}</div>
                          <div className="muted">{rowsText(f, t)}</div>
                        </td>
                        <td className="num">
                          {f.amount !== undefined ? <Money value={f.amount} /> : null}
                          {f.amountKind ? <div className="muted">{t(`amountKind.${f.amountKind}`)}</div> : null}
                        </td>
                        <td>
                          {rv ? t(`review.${rv.status}`) : t('review.unreviewed')}
                          {rv?.note ? <div className="muted">{rv.note}</div> : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
        <h3>{t('report.rulesUsed')}</h3>
        <ul className="rules-used">
          {RULES.map((rule) => (
            <li key={rule.id}>
              <strong>{rule.id}</strong> {t(`ruleText.${rule.id}.title`)}
              {rule.thresholds.map((th) => ` · ${t(`thresholdLabels.${th.key}`)}: ${settings.thresholds[th.key]}${th.unit === 'percent' ? '%' : th.unit === 'rm' ? ' RM' : ` ${t(`rules.units.${th.unit}`)}`}`).join('')}
            </li>
          ))}
        </ul>
        <p className="disclaimer-box">{t('app.disclaimer')}</p>
        <p className="muted small">{date(today)}</p>
      </section>
    </div>
  );
}
