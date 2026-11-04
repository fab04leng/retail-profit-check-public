import { useEffect, useRef, useState } from 'react';
import type { Evidence } from '../../analysis/types';
import { useI18n } from '../../i18n';
import { useApp } from '../state';
import type { SourceRows } from '../../worker/protocol';
import { TableWrap } from './common';
import { XIcon } from './Icons';

/** Shows the exact rows from the original files behind a finding. File text is rendered as text only. */
export function EvidenceDialog({ title, evidence, onClose }: { title: string; evidence: Evidence[]; onClose: () => void }) {
  const { t, num } = useI18n();
  const { getRows } = useApp();
  const ref = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<SourceRows[] | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) {
      try {
        d.showModal();
      } catch {
        d.setAttribute('open', '');
      }
    }
    let alive = true;
    Promise.all(evidence.map((e) => getRows(e.file, e.rows))).then((r) => alive && setData(r), () => alive && setData([]));
    return () => {
      alive = false;
    };
  }, [evidence, getRows]);

  return (
    <dialog ref={ref} className="evidence" onClose={onClose} aria-labelledby="evidence-title">
      <div className="evidence-head">
        <h2 id="evidence-title">{title}</h2>
        <button className="btn btn-icon" onClick={() => ref.current?.close()} aria-label={t('common.close')}>
          <XIcon />
        </button>
      </div>
      {!data ? <p>{t('common.loading')}</p> : null}
      {data?.map((d, i) => {
        const ev = evidence[i]!;
        const fileLabel = t(`fileNames.${d.kind}`);
        return (
          <section key={`${d.kind}-${i}`} className="evidence-file">
            <h3>{t('common.rowsInFile', { n: ev.rows.length, file: fileLabel })}</h3>
            <TableWrap label={fileLabel}>
              <table className="data small">
                <thead>
                  <tr>
                    <th scope="col">{t('common.row')}</th>
                    {d.headers.map((h, j) => (
                      <th scope="col" key={j}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.rows.map((r) => (
                    <tr key={r.row}>
                      <th scope="row" className="num">
                        {r.row}
                      </th>
                      {r.cells.map((c, j) => (
                        <td key={j}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            {ev.rows.length > d.rows.length ? (
              <details className="more-rows">
                <summary>{t('common.moreRows', { n: ev.rows.length - d.rows.length })}</summary>
                <p className="rownums">{ev.rows.slice(0, 5000).map((r) => num(r)).join(', ')}</p>
              </details>
            ) : null}
          </section>
        );
      })}
      <div className="evidence-foot">
        <button className="btn" onClick={() => ref.current?.close()}>
          {t('common.close')}
        </button>
      </div>
    </dialog>
  );
}
