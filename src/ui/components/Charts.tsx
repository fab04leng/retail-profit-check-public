import { useI18n } from '../../i18n';
import { AlertIcon } from './Icons';

/**
 * Single-series horizontal bars (magnitude). One hue, values labelled directly,
 * hover title per bar; the table next to it is the accessible view.
 */
export function HBarChart({ data, label }: { data: { key: string; label: string; value: number; sub?: string; highlight?: boolean }[]; label: string }) {
  const { rm } = useI18n();
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure className="hbar" aria-label={label}>
      {data.map((d) => (
        <div className="hbar-row" key={d.key} title={`${d.label}: ${rm(d.value)}${d.sub ? ` · ${d.sub}` : ''}`}>
          <div className="hbar-label">{d.label}</div>
          <div className="hbar-track">
            <div className={`hbar-fill ${d.highlight ? 'hbar-fill-strong' : ''}`} style={{ width: `${Math.max(d.value > 0 ? 1.5 : 0, (d.value / max) * 100)}%` }} />
          </div>
          <div className="hbar-value num">
            {rm(d.value)}
            {d.sub ? <span className="muted"> · {d.sub}</span> : null}
          </div>
        </div>
      ))}
    </figure>
  );
}

/**
 * Weekly closing balance: vertical bars from a zero line. Weeks below the minimum
 * use the reserved "critical" colour AND an icon + text label (never colour alone).
 */
export function CashChart({ weeks, minimum, label }: { weeks: { start: string; closing: number; below: boolean }[]; minimum: number; label: string }) {
  const { rm, date, t } = useI18n();
  const W = 640;
  const H = 240;
  const pad = { l: 8, r: 8, t: 22, b: 40 };
  const vals = weeks.map((w) => w.closing);
  const hi = Math.max(0, minimum, ...vals);
  const lo = Math.min(0, minimum, ...vals);
  const span = hi - lo || 1;
  const y = (v: number) => pad.t + ((hi - v) / span) * (H - pad.t - pad.b);
  const bw = (W - pad.l - pad.r) / Math.max(1, weeks.length);
  return (
    <figure className="cashchart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
        <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} className="axis" />
        {minimum !== 0 ? <line x1={pad.l} x2={W - pad.r} y1={y(minimum)} y2={y(minimum)} className="minline" /> : null}
        {weeks.map((w, i) => {
          const x = pad.l + i * bw + bw * 0.18;
          const top = Math.min(y(w.closing), y(0));
          const h = Math.max(2, Math.abs(y(w.closing) - y(0)));
          return (
            <g key={w.start}>
              <title>{`${t('cashflow.weekOf', { date: w.start })}: ${rm(w.closing)}${w.below ? ` — ${t('cashflow.belowMin')}` : ''}`}</title>
              <rect x={x} y={top} width={bw * 0.64} height={h} rx={4} className={w.below ? 'bar-critical' : 'bar'} />
              <text x={x + bw * 0.32} y={w.closing >= 0 ? top - 6 : top + h + 14} textAnchor="middle" className="barlabel">
                {Math.round(w.closing / 1000)}k
              </text>
              <text x={x + bw * 0.32} y={H - 14} textAnchor="middle" className="ticklabel">
                {date(w.start).replace(/ \d{4}$/, '').replace(/^\d{4}年/, '')}
              </text>
            </g>
          );
        })}
      </svg>
      {weeks.some((w) => w.below) ? (
        <figcaption className="legend-critical">
          <AlertIcon size={14} /> {t('cashflow.belowMin')}
        </figcaption>
      ) : null}
    </figure>
  );
}
