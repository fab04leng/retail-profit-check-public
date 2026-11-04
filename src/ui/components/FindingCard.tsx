import { useId, useState } from 'react';
import type { Finding } from '../../analysis/types';
import { useI18n } from '../../i18n';
import { href } from '../router';
import { useApp, type ReviewStatus } from '../state';
import { EvidenceDialog } from './Evidence';
import { Money } from './common';
import { CheckIcon, QuestionIcon, RowsIcon, XIcon } from './Icons';

const STATUSES: ReviewStatus[] = ['confirmed', 'not_issue', 'needs_info'];

const ISO_LIST = /^\d{4}-\d{2}-\d{2}(, \d{4}-\d{2}-\d{2})*$/;

/** Translated finding message. Lists of ISO dates in params are formatted for the reader's language. */
export function findingMessage(f: Finding, t: ReturnType<typeof useI18n>['t'], date?: (iso: string) => string): string {
  const params: Record<string, string | number | undefined> = { ...f.params, amount: f.amount };
  if (date) {
    for (const [k, v] of Object.entries(params)) {
      if (typeof v === 'string' && ISO_LIST.test(v) && (k === 'dates' || v.includes(','))) params[k] = v.split(', ').map(date).join(', ');
    }
  }
  return t(`findingText.${f.ruleId}`, params);
}

export function FindingCard({ finding: f }: { finding: Finding }) {
  const i18n = useI18n();
  const { t } = i18n;
  const { reviewMode, reviews, setReview } = useApp();
  const [open, setOpen] = useState(false);
  const review = reviews[f.id];
  const noteId = useId();
  const variant = f.ruleId === 'SUP-04' ? t(`findingTextVariant.${f.params.kind}`) : f.ruleId === 'SUP-01' && f.params.sameDate === 1 ? t('findingTextVariant.sameDate') : null;

  return (
    <article className={`finding sev-${f.severity} ${review ? `rev-${review.status}` : ''}`} aria-label={f.subject}>
      <header className="finding-head">
        <div className="finding-title">
          <a className="rule-badge" href={href("rules", { rule: f.ruleId })} title={t('common.viewRule')}>
            {f.ruleId}
          </a>
          <span className="rule-name">{t(`ruleText.${f.ruleId}.title`)}</span>
          {variant ? <span className="chip">{variant}</span> : null}
        </div>
        <div className="finding-amount">
          {f.amount !== undefined ? <Money value={f.amount} /> : null}
          {f.amountKind ? <span className="amount-kind">{t(`amountKind.${f.amountKind}`)}</span> : null}
        </div>
      </header>
      <h3 className="finding-subject">{f.subject}</h3>
      <p className="finding-text">{findingMessage(f, t, i18n.date)}</p>
      <div className="finding-tags">
        {f.estimate ? <span className="chip chip-est">{t('common.estimate')}</span> : null}
        {review ? (
          <span className={`chip chip-${review.status}`}>
            {review.status === 'confirmed' ? <CheckIcon size={14} /> : review.status === 'not_issue' ? <XIcon size={14} /> : <QuestionIcon size={14} />} {t(`review.${review.status}`)}
          </span>
        ) : (
          <span className="chip chip-review">{t('common.needsReview')}</span>
        )}
        <span className="chip chip-sev">{t(`severity.${f.severity}`)}</span>
      </div>
      <div className="finding-actions">
        {f.evidence.some((e) => e.rows.length) ? (
          <button className="btn btn-small" onClick={() => setOpen(true)}>
            <RowsIcon size={16} /> {t('common.showRows')}
          </button>
        ) : null}
        <details className="why">
          <summary>{t('common.why')}</summary>
          <p>{t(`ruleText.${f.ruleId}.why`)}</p>
        </details>
      </div>
      {reviewMode ? (
        <fieldset className="review">
          <legend>{t('review.status')}</legend>
          <div className="review-buttons">
            {STATUSES.map((s) => (
              <button key={s} type="button" aria-pressed={review?.status === s} className={`btn btn-small review-${s} ${review?.status === s ? 'is-on' : ''}`} onClick={() => setReview(f.id, review?.status === s ? null : s)}>
                {t(`review.${s}`)}
              </button>
            ))}
          </div>
          <label htmlFor={noteId} className="sr-only">
            {t('review.note')}
          </label>
          <textarea
            key={review ? 'has-review' : 'no-review'}
            id={noteId}
            className="note"
            placeholder={t('review.notePlaceholder')}
            defaultValue={review?.note ?? ''}
            maxLength={2000}
            rows={2}
            onBlur={(e) => {
              const v = e.currentTarget.value;
              if (v !== (review?.note ?? '')) setReview(f.id, review?.status ?? 'needs_info', v);
            }}
          />
          {review ? <p className="muted small">{t('review.reviewedOn', { date: review.at })}</p> : null}
        </fieldset>
      ) : review?.note ? (
        <p className="review-note">
          <strong>{t('review.note')}:</strong> {review.note}
        </p>
      ) : null}
      {open ? <EvidenceDialog title={`${f.ruleId} · ${f.subject}`} evidence={f.evidence} onClose={() => setOpen(false)} /> : null}
    </article>
  );
}

export function FindingList({ findings, limit = 20 }: { findings: Finding[]; limit?: number }) {
  const { t } = useI18n();
  const [all, setAll] = useState(false);
  if (!findings.length) return <p className="muted">{t('common.noFindings')}</p>;
  const shown = all ? findings : findings.slice(0, limit);
  return (
    <div className="finding-list">
      {shown.map((f) => (
        <FindingCard key={f.id} finding={f} />
      ))}
      {findings.length > limit ? (
        <button className="btn" onClick={() => setAll(!all)}>
          {all ? t('common.showLess') : t('common.showAll', { n: findings.length })}
        </button>
      ) : null}
    </div>
  );
}
