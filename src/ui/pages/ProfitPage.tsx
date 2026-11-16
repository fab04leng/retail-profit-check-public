import { useI18n } from '../../i18n';
import { useApp } from '../state';
import { HBarChart } from '../components/Charts';
import { FindingList } from '../components/FindingCard';
import { ProductTable } from '../components/ProductTable';
import { Money, NoData, PageHeader, Pct, Stat, TableWrap } from '../components/common';

export function ProfitPage() {
  const { t, num } = useI18n();
  const { payload, settings } = useApp();
  if (!payload) return <NoData />;
  const p = payload.result.profit;
  const withCost = p.products.filter((x) => x.grossProfit !== null);
  const worst = [...withCost].sort((a, b) => (a.grossProfit ?? 0) - (b.grossProfit ?? 0)).slice(0, 10);
  return (
    <>
      <PageHeader title={t('profit.title')} intro={t('profit.intro')} />
      <div className="stats">
        <Stat label={t('common.revenue')} value={<Money value={p.totals.revenue} />} />
        <Stat label={t('common.cogs')} value={<Money value={p.totals.cogs} />} />
        <Stat label={t('common.grossProfit')} value={<Money value={p.totals.grossProfit} />} />
        <Stat label={t('common.margin')} value={<Pct value={p.totals.marginPct} />} />
      </div>
      <section className="card">
        <h2>{t('profit.byCategory')}</h2>
        <HBarChart label={t('profit.byCategory')} data={p.categories.map((c) => ({ key: c.category, label: c.category, value: c.grossProfit, sub: c.marginPct === null ? undefined : `${c.marginPct.toFixed(1)}%` }))} />
        <TableWrap label={t('profit.byCategory')}>
          <table className="data">
            <thead>
              <tr>
                <th scope="col">{t('common.category')}</th>
                <th scope="col" className="num">{t('profit.skus')}</th>
                <th scope="col" className="num">{t('common.revenue')}</th>
                <th scope="col" className="num">{t('common.cogs')}</th>
                <th scope="col" className="num">{t('common.grossProfit')}</th>
                <th scope="col" className="num">{t('common.margin')}</th>
              </tr>
            </thead>
            <tbody>
              {p.categories.map((c) => (
                <tr key={c.category} className={c.marginPct !== null && c.marginPct < settings.thresholds.targetMarginPct ? 'row-warn' : ''}>
                  <td>{c.category}</td>
                  <td className="num">{num(c.skuCount)}</td>
                  <td className="num"><Money value={c.revenue} /></td>
                  <td className="num"><Money value={c.cogs} /></td>
                  <td className="num"><Money value={c.grossProfit} /></td>
                  <td className="num"><Pct value={c.marginPct} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </section>
      <section>
        <h2 className="section-title">{t('profit.belowCostTitle')}</h2>
        <FindingList findings={p.findings.filter((f) => f.ruleId === 'PRF-02')} />
      </section>
      <div className="grid-2">
        <section className="card">
          <h2>{t('profit.best')}</h2>
          <ProductTable rows={withCost.slice(0, 10)} label={t('profit.best')} />
        </section>
        <section className="card">
          <h2>{t('profit.worst')}</h2>
          <ProductTable rows={worst} label={t('profit.worst')} />
        </section>
      </div>
      <section>
        <h2 className="section-title">{t('profit.lowMarginTitle', { target: settings.thresholds.targetMarginPct })}</h2>
        <FindingList findings={p.findings.filter((f) => f.ruleId === 'PRF-03')} limit={8} />
      </section>
      <section className="card">
        <h2>{t('profit.allProducts')}</h2>
        <ProductTable rows={p.products} label={t('profit.allProducts')} paged filter />
      </section>
    </>
  );
}
