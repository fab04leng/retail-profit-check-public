import { useId } from 'react';
import { useI18n } from '../../i18n';
import { useApp } from '../state';
import { CashChart } from '../components/Charts';
import { FindingList } from '../components/FindingCard';
import { Money, NoData, PageHeader, TableWrap } from '../components/common';
import { AlertIcon } from '../components/Icons';
import { DraftNumber } from '../components/DraftNumber';

function NumberInput({ value, onChange, label, step = 100, min }: { value: number; onChange: (n: number) => void; label: string; step?: number; min?: number }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <DraftNumber id={id} step={step} min={min} value={Number.isFinite(value) ? value : 0} onCommit={onChange} />
    </div>
  );
}

export function CashflowPage() {
  const { t, num, date } = useI18n();
  const { payload, settings, setCashflow, setThreshold } = useApp();
  if (!payload) return <NoData />;
  const c = payload.result.cashflow;
  const inputs = settings.cashflow;
  const update = (patch: Partial<typeof inputs>) => setCashflow({ ...inputs, ...patch });
  return (
    <>
      <PageHeader title={t('cashflow.title')} intro={t('cashflow.intro')} />
      <section className="card" aria-labelledby="cf-inputs">
        <h2 id="cf-inputs">{t('cashflow.inputs')}</h2>
        <div className="form-grid">
          <NumberInput
            label={c.balanceAsOf ? t('cashflow.openingBalanceAsOf', { date: c.balanceAsOf }) : t('cashflow.openingBalance')}
            value={inputs.openingBalance}
            onChange={(n) => update({ openingBalance: n })}
          />
          <NumberInput label={t('cashflow.minimum')} value={settings.thresholds.minimumBalance} onChange={(n) => setThreshold('minimumBalance', n)} />
        </div>
        <h3>{t('cashflow.fixedCosts')}</h3>
        <div className="costs">
          {inputs.fixedCosts.map((fc, i) => (
            <div className="cost-row" key={fc.id}>
              <div className="field">
                <label htmlFor={`cost-label-${fc.id}`}>{t('cashflow.costLabel')}</label>
                <input id={`cost-label-${fc.id}`} type="text" maxLength={60} value={fc.label} onChange={(e) => update({ fixedCosts: inputs.fixedCosts.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
              </div>
              <NumberInput label={t('cashflow.costAmount')} value={fc.amount} min={0} onChange={(n) => update({ fixedCosts: inputs.fixedCosts.map((x, j) => (j === i ? { ...x, amount: Math.max(0, n) } : x)) })} />
              <NumberInput label={t('cashflow.costDay')} value={fc.dayOfMonth} step={1} min={1} onChange={(n) => update({ fixedCosts: inputs.fixedCosts.map((x, j) => (j === i ? { ...x, dayOfMonth: Math.min(31, Math.max(1, Math.round(n))) } : x)) })} />
              <button className="btn btn-link btn-small" onClick={() => update({ fixedCosts: inputs.fixedCosts.filter((_, j) => j !== i) })}>{t('cashflow.removeCost')}</button>
            </div>
          ))}
          {inputs.fixedCosts.length < 20 ? (
            <button className="btn btn-small" onClick={() => update({ fixedCosts: [...inputs.fixedCosts, { id: `c${Date.now()}`, label: '', amount: 0, dayOfMonth: 1 }] })}>+ {t('cashflow.addCost')}</button>
          ) : null}
        </div>
        <label className="check">
          <input type="checkbox" checked={inputs.includeRestocking} onChange={(e) => update({ includeRestocking: e.target.checked })} /> {t('cashflow.includeRestocking')}
        </label>
      </section>
      {c.weeks.length === 0 ? (
        <p className="info-line">{t('cashflow.noSales')}</p>
      ) : (
        <>
          <section className="card">
            <h2>
              {t('cashflow.chartTitle')} <span className="chip chip-est">{t('common.estimate')}</span>
            </h2>
            <CashChart label={t('cashflow.chartTitle')} minimum={settings.thresholds.minimumBalance} weeks={c.weeks.map((w) => ({ start: w.start, closing: w.closing, below: w.belowMinimum }))} />
            <TableWrap label={t('cashflow.title')}>
              <table className="data">
                <thead>
                  <tr>
                    <th scope="col">{t('cashflow.week')}</th>
                    <th scope="col" className="num">{t('cashflow.opening')}</th>
                    <th scope="col" className="num">{t('cashflow.salesIn')}</th>
                    <th scope="col" className="num">{t('cashflow.supplierOut')}</th>
                    <th scope="col" className="num">{t('cashflow.fixedOut')}</th>
                    <th scope="col" className="num">{t('cashflow.restockOut')}</th>
                    <th scope="col" className="num">{t('cashflow.closing')}</th>
                  </tr>
                </thead>
                <tbody>
                  {c.weeks.map((w) => (
                    <tr key={w.start} className={w.belowMinimum ? 'row-bad' : ''}>
                      <th scope="row">
                        {date(w.start)}
                        {w.belowMinimum ? (
                          <span className="chip chip-critical">
                            <AlertIcon size={12} /> {t('cashflow.belowMin')}
                          </span>
                        ) : null}
                      </th>
                      <td className="num"><Money value={w.opening} /></td>
                      <td className="num"><Money value={w.salesIn} /></td>
                      <td className="num">
                        <Money value={w.supplierOut ? -w.supplierOut : 0} />
                        {w.overdueOut ? <div className="muted small">{t('cashflow.overdue', { amount: w.overdueOut })}</div> : null}
                      </td>
                      <td className="num" title={w.fixedItems.map((f) => `${f.label} ${date(f.date)}`).join(', ')}><Money value={w.fixedOut ? -w.fixedOut : 0} /></td>
                      <td className="num"><Money value={w.restockOut ? -w.restockOut : 0} /></td>
                      <td className="num strong"><Money value={w.closing} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            <p className="muted small">{t('cashflow.later', { amount: c.laterSupplierOut })}</p>
          </section>
          <section>
            <h2 className="section-title">{t('ruleText.CSH-02.title')}</h2>
            <FindingList findings={c.findings} />
          </section>
          <section className="card">
            <h2>{t('cashflow.method')}</h2>
            <p>{t('cashflow.methodText', { weeks: c.history.length, slope: c.method.slope, ratio: (c.method.costRatio ?? 0) * 100, terms: c.method.termsWeeks })}</p>
            <p className="muted small">{t('ruleText.CSH-01.description')}</p>
            <h3>{t('cashflow.history')}</h3>
            <TableWrap label={t('cashflow.history')}>
              <table className="data small">
                <tbody>
                  <tr>
                    {c.history.map((h) => <th key={h.start} scope="col">{date(h.start)}</th>)}
                  </tr>
                  <tr>
                    {c.history.map((h) => <td key={h.start} className="num">{num(h.sales)}</td>)}
                  </tr>
                </tbody>
              </table>
            </TableWrap>
          </section>
        </>
      )}
    </>
  );
}
