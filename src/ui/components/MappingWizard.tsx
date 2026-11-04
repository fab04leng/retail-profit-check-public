import { useId } from 'react';
import { FIELDS } from '../../core/fields';
import type { Mapping } from '../../core/mapping';
import { useI18n } from '../../i18n';
import type { StagedMeta } from '../../worker/protocol';
import { TableWrap } from './common';
import { AlertIcon, CheckIcon } from './Icons';

function colLetter(i: number): string {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

export function MappingWizard({ meta, onChange }: { meta: StagedMeta; onChange: (m: Mapping) => void }) {
  const { t } = useI18n();
  const base = useId();
  const fields = FIELDS[meta.kind];
  const fieldName = (k: string) => t(`fields.${k}`);
  return (
    <div className="mapping">
      <h4>{t('mapping.title')}</h4>
      <p className="muted small">
        {meta.remembered ? t('mapping.remembered') : t('mapping.intro')} {t('mapping.headerRow', { n: meta.headerRow + 1 })}
      </p>
      <TableWrap label={t('mapping.title')}>
        <table className="data small mapping-table">
          <thead>
            <tr>
              <th scope="col">{t('mapping.field')}</th>
              <th scope="col">{t('mapping.column')}</th>
              <th scope="col">{t('mapping.sample')}</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => {
              const col = meta.mapping[f.key];
              const id = `${base}-${f.key}`;
              const needed = f.required || !!f.oneOf;
              return (
                <tr key={f.key} className={col === undefined && f.required ? 'missing' : ''}>
                  <th scope="row">
                    <label htmlFor={id}>
                      {fieldName(f.key)}
                      {f.required ? <span className="req" aria-hidden="true"> *</span> : null}
                    </label>
                    {needed && !f.required ? <span className="muted small"> ({t('start.optional')}*)</span> : null}
                  </th>
                  <td>
                    <select
                      id={id}
                      value={col === undefined ? '' : String(col)}
                      onChange={(e) => {
                        const next: Mapping = { ...meta.mapping };
                        if (e.target.value === '') delete next[f.key];
                        else next[f.key] = Number(e.target.value);
                        onChange(next);
                      }}
                    >
                      <option value="">{t('mapping.notUsed')}</option>
                      {meta.headers.map((h, i) => (
                        <option key={i} value={i}>
                          {colLetter(i)}: {h || '—'}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="sample">{col === undefined ? '' : meta.preview.slice(0, 3).map((r) => r[col] ?? '').join(' · ')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>
      {meta.problems.length ? (
        <ul className="problems" role="alert">
          {meta.problems.map((p, i) => (
            <li key={i}>
              <AlertIcon size={14} /> {t(`mapping.${p.code}`, { fields: p.fields.map(fieldName).join(', ') })}
            </li>
          ))}
        </ul>
      ) : (
        <p className="ok-line">
          <CheckIcon size={14} /> {t('mapping.ok')}
        </p>
      )}
    </div>
  );
}
