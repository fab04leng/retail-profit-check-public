import { useMemo, useState } from 'react';
import { useI18n } from '../../i18n';
import { AGE_BUCKETS } from '../../rules/rules.config';
import { useApp } from '../state';
import { HBarChart } from '../components/Charts';
import { FindingList } from '../components/FindingCard';
import { Money, NoData, PageHeader, Stat, TableWrap } from '../components/common';

const PAGE = 25;

export function StockPage() {
  const { t, num, date } = useI18n();
  const { payload, settings } = useApp();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const items = payload?.result.stock.items;
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = (items ?? []).filter((i) => i.qtyOnHand > 0);
    const f = s ? base.filter((i) => `${i.sku} ${i.name} ${i.category}`.toLowerCase().includes(s)) : base;
    return [...f].sort((a, b) => (b.coverDays ?? Infinity) - (a.coverDays ?? Infinity) || b.value - a.value);
  }, [items, q]);
  if (!payload) return <NoData />;
  const s = payload.result.stock;
  const th = settings.thresholds;
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  return (
    <>
      <PageHeader title={t('stock.title')} intro={t('stock.intro')} />
      {s.asOf ? <p className="muted small">{t('common.asOf', { date: s.asOf })}</p> : null}
      <div className="stats">
        <Stat label={t('stock.totalValue')} value={<Money value={s.totalValue} />} />
        <Stat label={t('stock.slowValue', { days: th.slowStockDays })} value={<Money value={s.slowValue} />} sub={t('stock.products', { n: s.slowCount })} tone="warn" />
        <Stat label={t('stock.deadValue', { days: th.deadStockDays })} value={<Money value={s.deadValue} />} sub={t('stock.products', { n: s.deadCount })} tone="bad" />
      </div>
      <section className="card">
        <h2>{t('stock.byAge')}</h2>
        <HBarChart
          label={t('stock.byAge')}
          data={s.buckets.map((b, i) => ({ key: b.key, label: t(`stock.bucket.${b.key}`), value: b.value, sub: t('stock.products', { n: b.count }), highlight: AGE_BUCKETS[i]!.max > 90 }))}
        />
      </section>
      <section>
        <h2 className="section-title">{t('stock.deadTitle')}</h2>
        <FindingList findings={s.findings.filter((f) => f.ruleId === 'STK-02')} limit={10} />
      </section>
      <section>
        <h2 className="section-title">{t('ruleText.STK-03.title')}</h2>
        <FindingList findings={s.findings.filter((f) => f.ruleId === 'STK-03')} limit={6} />
      </section>
      <section className="card">
        <h2>{t('stock.coverTitle')}</h2>
        <p className="muted small">{t('stock.coverIntro', { days: th.coverLookbackDays })}</p>
        <input className="filter" type="search" placeholder={t('stock.filter')} aria-label={t('stock.filter')} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        <TableWrap label={t('stock.coverTitle')}>
          <table className="data">
            <thead>
              <tr>
                <th scope="col">{t('common.sku')}</th>
                <th scope="col">{t('common.product')}</th>
                <th scope="col" className="num">{t('stock.onHand')}</th>
                <th scope="col" className="num">{t('common.value')}</th>
                <th scope="col" className="hide-sm">{t('stock.lastSale')}</th>
                <th scope="col" className="num">{t('stock.age')}</th>
                <th scope="col" className="num">{t('stock.cover')}</th>
              </tr>
            </thead>
            <tbody>
              {list.slice(page * PAGE, page * PAGE + PAGE).map((i) => (
                <tr key={i.sku} className={i.ageDays !== null && i.ageDays > th.deadStockDays ? 'row-bad' : i.ageDays !== null && i.ageDays > th.slowStockDays ? 'row-warn' : ''}>
                  <td>{i.sku}</td>
                  <td>{i.name}</td>
                  <td className="num">{num(i.qtyOnHand)}</td>
                  <td className="num"><Money value={i.value} /></td>
                  <td className="hide-sm">{i.lastSale ? date(i.lastSale) : <span className="muted">{t('stock.never')}</span>}</td>
                  <td className="num">{i.ageDays === null ? '—' : num(i.ageDays)}</td>
                  <td className="num">{i.coverDays === null ? <span className="muted">{t('stock.noRecentSales')}</span> : num(i.coverDays)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        {pages > 1 ? (
          <div className="pager">
            <button className="btn btn-small" disabled={page === 0} onClick={() => setPage(page - 1)}>{t('common.previous')}</button>
            <span>{t('common.pageOf', { page: page + 1, pages })}</span>
            <button className="btn btn-small" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>{t('common.next')}</button>
          </div>
        ) : null}
      </section>
    </>
  );
}
