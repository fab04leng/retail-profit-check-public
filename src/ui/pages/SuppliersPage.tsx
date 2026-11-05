import { useI18n } from '../../i18n';
import type { RuleId } from '../../rules/rules.config';
import { useApp } from '../state';
import { FindingList } from '../components/FindingCard';
import { Money, NoData, PageHeader, TableWrap } from '../components/common';
import { InfoIcon } from '../components/Icons';

const ORDER: RuleId[] = ['SUP-01', 'SUP-02', 'SUP-04', 'SUP-05', 'SUP-03'];

export function SuppliersPage() {
  const { t, num } = useI18n();
  const { payload } = useApp();
  if (!payload) return <NoData />;
  const s = payload.result.suppliers;
  return (
    <>
      <PageHeader title={t('suppliers.title')} intro={t('suppliers.intro')} />
      {!payload.hasPayments ? (
        <p className="info-line">
          <InfoIcon size={16} /> {t('suppliers.noPayments')}
        </p>
      ) : null}
      {ORDER.filter((id) => payload.hasPayments || (id !== 'SUP-04' && id !== 'SUP-05')).map((id) => (
        <section key={id}>
          <h2 className="section-title">
            <span className="rule-badge">{id}</span> {t(`ruleText.${id}.title`)}
          </h2>
          <FindingList findings={s.findings.filter((f) => f.ruleId === id)} limit={8} />
        </section>
      ))}
      <section className="card">
        <h2>{t('suppliers.summary')}</h2>
        <TableWrap label={t('suppliers.summary')}>
          <table className="data">
            <thead>
              <tr>
                <th scope="col">{t('common.supplier')}</th>
                <th scope="col" className="num">{t('suppliers.invoices')}</th>
                <th scope="col" className="num">{t('common.total')}</th>
                <th scope="col" className="num">{t('suppliers.flagged')}</th>
              </tr>
            </thead>
            <tbody>
              {s.suppliers.map((x) => (
                <tr key={x.supplier} className={x.findings ? 'row-warn' : ''}>
                  <td>{x.supplier}</td>
                  <td className="num">{num(x.invoices)}</td>
                  <td className="num"><Money value={x.total} /></td>
                  <td className="num">{x.findings ? num(x.findings) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </section>
    </>
  );
}
