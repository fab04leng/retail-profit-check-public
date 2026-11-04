import { useRef, useState } from 'react';
import { templateCsv } from '../../core/templates';
import { FILE_KINDS, type FileKind } from '../../core/types';
import { useI18n } from '../../i18n';
import { downloadText } from '../download';
import { navigate } from '../router';
import { useApp } from '../state';
import { MappingWizard } from '../components/MappingWizard';
import { PageHeader, TableWrap } from '../components/common';
import { AlertIcon, CheckIcon, DownloadIcon, LockIcon } from '../components/Icons';

const REQUIRED: FileKind[] = ['sales', 'products'];

function FileCard({ kind }: { kind: FileKind }) {
  const { t } = useI18n();
  const { staged, fileErrors, stageFile, setMapping, removeFile, busy, isDemo } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const meta = staged[kind];
  const err = fileErrors[kind];
  const id = `file-${kind}`;
  const needsFix = meta && meta.problems.length > 0;
  return (
    <section className={`card filecard ${needsFix ? 'needs-fix' : ''}`} aria-labelledby={`${id}-title`}>
      <div className="filecard-head">
        <h3 id={`${id}-title`}>
          {t(`files.${kind}.title`)} <span className={`chip ${REQUIRED.includes(kind) ? 'chip-req' : ''}`}>{REQUIRED.includes(kind) ? t('start.required') : t('start.optional')}</span>
        </h3>
        <button className="btn btn-link btn-small" onClick={() => downloadText(`template-${kind}.csv`, templateCsv(kind), 'text/csv')}>
          <DownloadIcon size={14} /> {t('start.template')}
        </button>
      </div>
      <p className="muted small">{t(`files.${kind}.desc`)}</p>
      <div className="filecard-actions">
        <input
          ref={input}
          id={id}
          type="file"
          accept=".csv,.txt,.tsv,.xlsx,.xlsm,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void stageFile(kind, f);
            e.target.value = '';
          }}
          data-testid={`upload-${kind}`}
        />
        <label htmlFor={id} className={`btn ${meta && !isDemo ? '' : 'btn-primary-outline'} ${busy ? 'is-disabled' : ''}`}>
          {meta && !isDemo ? t('start.replaceFile') : t('start.chooseFile')}
        </label>
        {meta && !isDemo ? (
          <button className="btn btn-link" onClick={() => void removeFile(kind)}>
            {t('start.removeFile')}
          </button>
        ) : null}
      </div>
      {err ? (
        <p className="error-line" role="alert">
          <AlertIcon size={14} /> {t(`readErrors.${err}`) === `readErrors.${err}` ? t('readErrors.generic') : t(`readErrors.${err}`)}
        </p>
      ) : null}
      {meta ? (
        <>
          <p className="ok-line">
            <CheckIcon size={14} /> {t('start.rowsRead', { n: meta.dataRowCount, file: meta.fileName })}
          </p>
          {meta.dataRowCount > 50000 ? <p className="muted small">{t('start.largeFile')}</p> : null}
          {!isDemo ? <MappingWizard meta={meta} onChange={(m) => void setMapping(kind, m)} /> : null}
        </>
      ) : null}
    </section>
  );
}

function IssuesPanel() {
  const { t } = useI18n();
  const { payload } = useApp();
  const [open, setOpen] = useState<FileKind | null>(null);
  if (!payload) return null;
  const unknown = payload.result.profit.unknownSkus;
  const total = FILE_KINDS.reduce((a, k) => a + payload.issueCounts[k].errors + payload.issueCounts[k].warnings, 0);
  return (
    <section className="card" aria-labelledby="issues-title">
      <h2 id="issues-title">{t('start.dataIssues')}</h2>
      <p className="muted small">{t('start.dataIssuesIntro')}</p>
      {total === 0 ? (
        <p className="ok-line">
          <CheckIcon size={14} /> {t('start.noIssues')}
        </p>
      ) : null}
      {FILE_KINDS.filter((k) => payload.issueCounts[k].errors + payload.issueCounts[k].warnings > 0).map((k) => {
        const c = payload.issueCounts[k];
        const list = payload.issues.filter((i) => i.file === k);
        return (
          <div key={k} className="issue-file">
            <p>
              <strong>{t(`fileNames.${k}`)}:</strong> {t('start.issueCounts', { errors: c.errors, warnings: c.warnings })}{' '}
              <button className="btn btn-link btn-small" aria-expanded={open === k} onClick={() => setOpen(open === k ? null : k)}>
                {open === k ? t('start.hideIssues') : t('start.showIssues')}
              </button>
            </p>
            {open === k ? (
              <TableWrap label={t(`fileNames.${k}`)}>
                <table className="data small">
                  <thead>
                    <tr>
                      <th scope="col">{t('common.row')}</th>
                      <th scope="col">{t('issues.error')}/{t('issues.warning')}</th>
                      <th scope="col">{t('common.value')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((i, n) => (
                      <tr key={n}>
                        <td className="num">{i.row}</td>
                        <td>{i.level === 'error' ? t('issues.error') : t('issues.warning')}</td>
                        <td>{t(`issues.${i.code}`, { field: i.field ? t(`fields.${i.field}`) : '', value: i.value ?? '', rows: (i.rows ?? []).join(', ') })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : null}
            {open === k && c.errors + c.warnings > list.length ? <p className="muted small">{t('start.moreIssues', { n: c.errors + c.warnings - list.length })}</p> : null}
          </div>
        );
      })}
      {unknown.length ? (
        <p className="warn-line">
          <AlertIcon size={14} /> {t('start.unknownSkus', { n: unknown.length, rm: unknown.reduce((a, u) => a + u.revenue, 0) })}{' '}
          <span className="muted small">{unknown.slice(0, 8).map((u) => u.sku).join(', ')}{unknown.length > 8 ? '…' : ''}</span>
        </p>
      ) : null}
    </section>
  );
}

export function StartPage() {
  const { t } = useI18n();
  const app = useApp();
  const { staged, busy, isDemo, payload } = app;
  const [msg, setMsg] = useState<string | null>(null);
  const hasRequired = REQUIRED.every((k) => staged[k]);
  const problems = Object.values(staged).some((m) => m && m.problems.length);
  return (
    <>
      <PageHeader title={t('start.title')} intro={t('start.intro')} />
      <div className="privacy-box card">
        <LockIcon size={22} />
        <div>
          <strong>{t('app.privacy')}</strong>
          <p className="small">{t('app.privacyLong')}</p>
        </div>
      </div>
      <section className="card demo-card" aria-labelledby="demo-title">
        <h2 id="demo-title">{t('start.demoTitle')}</h2>
        <p>{t('start.demoBody')}</p>
        <button
          className="btn btn-primary btn-large"
          disabled={!!busy}
          onClick={async () => {
            if (await app.loadDemo()) navigate('health');
          }}
          data-testid="load-demo"
        >
          {busy === 'demo' ? t('start.loadingDemo') : t('start.loadDemo')}
        </button>
      </section>
      <h2 className="section-title">{t('start.yourFiles')}</h2>
      <p className="muted">{t('start.filesHint')}</p>
      <details className="howto">
        <summary>{t('start.howTo')}</summary>
        <p className="small">{t('start.howToBody')}</p>
      </details>
      <div className="grid-2">
        {FILE_KINDS.map((k) => (
          <FileCard key={k} kind={k} />
        ))}
      </div>
      <div className="analyse-bar">
        {!isDemo ? (
          <button
            className="btn btn-primary btn-large"
            disabled={!hasRequired || problems || !!busy}
            onClick={async () => {
              if (await app.analyse()) setMsg(t('start.done'));
            }}
            data-testid="analyse"
          >
            {busy === 'analysing' || busy === 'reading' ? t('common.analysing') : payload ? t('start.reanalyse') : t('start.analyse')}
          </button>
        ) : null}
        {!hasRequired && !isDemo ? <span className="muted small">{t('start.needSales')}</span> : null}
        {problems ? <span className="warn-line small">{t('start.fixMapping')}</span> : null}
        {payload ? (
          <a className="btn" href="#/health">
            {t('start.goHealth')}
          </a>
        ) : null}
        <span aria-live="polite" className="small">
          {msg}
        </span>
      </div>
      {app.error ? (
        <p className="error-line" role="alert">
          <AlertIcon size={14} /> {t(`readErrors.${app.error}`) === `readErrors.${app.error}` ? t('readErrors.generic') : t(`readErrors.${app.error}`)}
        </p>
      ) : null}
      <IssuesPanel />
      <div className="danger-zone">
        <button
          className="btn btn-link"
          onClick={async () => {
            if (globalThis.confirm?.(t('start.clearAllConfirm'))) {
              await app.clearEverything();
              setMsg(t('start.cleared'));
            }
          }}
        >
          {t('start.clearAll')}
        </button>
      </div>
    </>
  );
}
