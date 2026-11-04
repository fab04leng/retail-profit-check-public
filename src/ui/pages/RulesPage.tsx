import { useEffect } from 'react';
import { useI18n } from '../../i18n';
import { RULES, type RuleArea } from '../../rules/rules.config';
import type { Route } from '../router';
import { useApp } from '../state';
import { PageHeader } from '../components/common';
import { DraftNumber } from '../components/DraftNumber';

const AREAS: RuleArea[] = ['profit', 'stock', 'suppliers', 'cashflow'];

export function RulesPage({ route }: { route: Route }) {
  const { t, num } = useI18n();
  const { settings, setThreshold, resetThresholds, payload } = useApp();
  const focus = route.query.get('rule');
  useEffect(() => {
    if (focus) document.getElementById(`rule-${focus}`)?.scrollIntoView({ block: 'center' });
  }, [focus]);
  const fired = (id: string) => payload?.result.findings.filter((f) => f.ruleId === id).length;
  return (
    <>
      <PageHeader title={t('rules.title')} intro={t('rules.intro')}>
        <button className="btn" onClick={resetThresholds}>{t('rules.resetAll')}</button>
      </PageHeader>
      <p className="muted small">{t('rules.file')}</p>
      {AREAS.map((area) => (
        <section key={area}>
          <h2 className="section-title">{t(`findings.areas.${area}`)}</h2>
          <div className="rules">
            {RULES.filter((r) => r.area === area).map((r) => (
              <article key={r.id} id={`rule-${r.id}`} className={`card rule ${focus === r.id ? 'is-focus' : ''}`}>
                <header className="rule-head">
                  <span className="rule-badge">{r.id}</span>
                  <h3>{t(`ruleText.${r.id}.title`)}</h3>
                  <span className="chip">{r.kind === 'flag' ? t('rules.kindFlag') : t('rules.kindMethod')}</span>
                  {r.kind === 'flag' && payload ? <span className="chip chip-review">{t('rules.fired', { n: fired(r.id) ?? 0 })}</span> : null}
                </header>
                <p>{t(`ruleText.${r.id}.description`)}</p>
                <p className="why-text"><strong>{t('common.why')}:</strong> {t(`ruleText.${r.id}.why`)}</p>
                {r.thresholds.map((th) => (
                  <div className="field threshold" key={th.key}>
                    <label htmlFor={`th-${th.key}`}>{t(`thresholdLabels.${th.key}`)}</label>
                    <div className="input-unit">
                      {th.unit === 'rm' ? <span className="unit">RM</span> : null}
                      <DraftNumber id={`th-${th.key}`} min={th.min} max={th.max} step={th.step} value={settings.thresholds[th.key]} onCommit={(n) => setThreshold(th.key, n)} data-testid={`threshold-${th.key}`} />
                      {th.unit !== 'rm' ? <span className="unit">{t(`rules.units.${th.unit}`)}</span> : null}
                    </div>
                    <span className="muted small">{t('rules.default', { value: `${th.unit === 'rm' ? 'RM ' : ''}${num(th.default, th.step < 1 ? 1 : 0)}${th.unit === 'percent' ? '%' : th.unit === 'rm' ? '' : ` ${t(`rules.units.${th.unit}`)}`}` })}</span>
                  </div>
                ))}
              </article>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
