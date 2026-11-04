import { useMemo, useState } from 'react';
import type { ProductProfit } from '../../analysis/profit';
import { useI18n } from '../../i18n';
import { Money, Pct, TableWrap } from './common';

const PAGE = 25;

export function ProductTable({ rows, label, paged = false, filter = false }: { rows: ProductProfit[]; label: string; paged?: boolean; filter?: boolean }) {
  const { t, num } = useI18n();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((r) => `${r.sku} ${r.name} ${r.category}`.toLowerCase().includes(s)) : rows;
  }, [rows, q]);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const shown = paged ? list.slice(page * PAGE, page * PAGE + PAGE) : list;
  return (
    <div>
      {filter ? (
        <input className="filter" type="search" placeholder={t('profit.filter')} aria-label={t('profit.filter')} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
      ) : null}
      <TableWrap label={label}>
        <table className="data">
          <thead>
            <tr>
              <th scope="col">{t('common.sku')}</th>
              <th scope="col">{t('common.product')}</th>
              <th scope="col" className="hide-sm">{t('common.category')}</th>
              <th scope="col" className="num">{t('common.units')}</th>
              <th scope="col" className="num">{t('common.revenue')}</th>
              <th scope="col" className="num hide-sm">{t('profit.avgPrice')}</th>
              <th scope="col" className="num hide-sm">{t('profit.unitCost')}</th>
              <th scope="col" className="num">{t('common.grossProfit')}</th>
              <th scope="col" className="num">{t('common.margin')}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.sku} className={r.grossProfit !== null && r.grossProfit < 0 ? 'row-bad' : ''}>
                <td>{r.sku}</td>
                <td>{r.name}</td>
                <td className="hide-sm">{r.category}</td>
                <td className="num">{num(r.units)}</td>
                <td className="num"><Money value={r.revenue} /></td>
                <td className="num hide-sm"><Money value={r.avgPrice} /></td>
                <td className="num hide-sm">{r.unitCost === null ? <span className="muted">{t('profit.noCost')}</span> : <Money value={r.unitCost} />}</td>
                <td className="num"><Money value={r.grossProfit} /></td>
                <td className="num"><Pct value={r.marginPct} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
      {paged && pages > 1 ? (
        <div className="pager">
          <button className="btn btn-small" disabled={page === 0} onClick={() => setPage(page - 1)}>{t('common.previous')}</button>
          <span>{t('common.pageOf', { page: page + 1, pages })}</span>
          <button className="btn btn-small" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>{t('common.next')}</button>
        </div>
      ) : null}
    </div>
  );
}
