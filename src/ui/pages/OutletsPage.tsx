import { useI18n } from '../../i18n';
import { useApp } from '../state';
import { HBarChart } from '../components/Charts';
import { Money, NoData, PageHeader, Pct, TableWrap } from '../components/common';

export function OutletsPage() {
  const { t, num, pct } = useI18n();
  const { payload } = useApp();
  if (!payload) return <NoData />;
  const o = payload.result.profit.outlets;
  const total = o.reduce((a, x) => a + x.revenue, 0) || 1;
  return (
    <>
      <PageHeader title={t('outlets.title')} intro={t('outlets.intro')} />
      {o.length < 2 ? <p className="info-line">{t('outlets.single')}</p> : null}
      <section className="card">
        <h2>{t('common.grossProfit')}</h2>
        <HBarChart label={t('common.grossProfit')} data={o.map((x) => ({ key: x.outlet, label: x.outlet, value: x.grossProfit, sub: x.marginPct === null ? undefined : pct(x.marginPct) }))} />
        <TableWrap label={t('outlets.title')}>
          <table className="data">
            <thead>
              <tr>
                <th scope="col">{t('nav.outlets')}</th>
                <th scope="col" className="num">{t('common.revenue')}</th>
                <th scope="col" className="num">{t('outlets.share')}</th>
                <th scope="col" className="num">{t('common.grossProfit')}</th>
                <th scope="col" className="num">{t('common.margin')}</th>
                <th scope="col" className="num">{t('outlets.receipts')}</th>
                <th scope="col" className="num">{t('outlets.avgReceipt')}</th>
              </tr>
            </thead>
            <tbody>
              {o.map((x) => (
                <tr key={x.outlet}>
                  <td>{x.outlet}</td>
                  <td className="num"><Money value={x.revenue} /></td>
                  <td className="num">{pct((x.revenue / total) * 100)}</td>
                  <td className="num"><Money value={x.grossProfit} /></td>
                  <td className="num"><Pct value={x.marginPct} /></td>
                  <td className="num">{num(x.receipts)}</td>
                  <td className="num"><Money value={x.avgReceipt} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </section>
    </>
  );
}
