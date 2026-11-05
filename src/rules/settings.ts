import { RULES, type ThresholdKey } from './rules.config';

/** Thresholds the analyses use. Defaults come from rules.config.ts. */
export type Thresholds = Record<ThresholdKey, number>;

export interface FixedCost {
  id: string;
  label: string;
  /** RM per month. */
  amount: number;
  /** Day of month it is paid (1–31; clamped to month length). */
  dayOfMonth: number;
}

export interface CashflowInputs {
  openingBalance: number;
  fixedCosts: FixedCost[];
  includeRestocking: boolean;
}

export interface Settings {
  thresholds: Thresholds;
  cashflow: CashflowInputs;
}

export function defaultThresholds(): Thresholds {
  const t = {} as Thresholds;
  for (const rule of RULES) for (const th of rule.thresholds) t[th.key] = th.default;
  return t;
}

export function defaultCashflowInputs(): CashflowInputs {
  return {
    openingBalance: 0,
    fixedCosts: [
      { id: 'rent', label: 'Rent', amount: 0, dayOfMonth: 1 },
      { id: 'salaries', label: 'Salaries', amount: 0, dayOfMonth: 7 },
      { id: 'utilities', label: 'Utilities', amount: 0, dayOfMonth: 15 },
    ],
    includeRestocking: true,
  };
}

export function defaultSettings(): Settings {
  return { thresholds: defaultThresholds(), cashflow: defaultCashflowInputs() };
}

/** Clamp a user-entered threshold to the limits in the rules config. */
export function clampThreshold(key: ThresholdKey, value: number): number {
  for (const rule of RULES) {
    for (const th of rule.thresholds) {
      if (th.key === key) {
        if (!Number.isFinite(value)) return th.default;
        return Math.min(th.max, Math.max(th.min, value));
      }
    }
  }
  return value;
}

/** Merge possibly-partial stored settings over the defaults (for old/corrupt localStorage). */
export function mergeSettings(stored: unknown): Settings {
  const base = defaultSettings();
  if (!stored || typeof stored !== 'object') return base;
  const s = stored as Partial<Settings>;
  if (s.thresholds && typeof s.thresholds === 'object') {
    for (const key of Object.keys(base.thresholds) as ThresholdKey[]) {
      const v = (s.thresholds as Record<string, unknown>)[key];
      if (typeof v === 'number') base.thresholds[key] = clampThreshold(key, v);
    }
  }
  if (s.cashflow && typeof s.cashflow === 'object') {
    const c = s.cashflow as Partial<CashflowInputs>;
    if (typeof c.openingBalance === 'number' && Number.isFinite(c.openingBalance)) base.cashflow.openingBalance = c.openingBalance;
    if (typeof c.includeRestocking === 'boolean') base.cashflow.includeRestocking = c.includeRestocking;
    if (Array.isArray(c.fixedCosts)) {
      base.cashflow.fixedCosts = c.fixedCosts
        .filter((f): f is FixedCost => !!f && typeof f === 'object' && typeof (f as FixedCost).amount === 'number')
        .slice(0, 20)
        .map((f, i) => ({
          id: typeof f.id === 'string' ? f.id : `cost-${i}`,
          label: typeof f.label === 'string' ? f.label.slice(0, 60) : '',
          amount: Number.isFinite(f.amount) ? f.amount : 0,
          dayOfMonth: Math.min(31, Math.max(1, Math.round(Number(f.dayOfMonth) || 1))),
        }));
    }
  }
  return base;
}
