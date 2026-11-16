import { addDays, daysInMonth, mondayOf, toISO, weekdayMon0 } from '../core/dates';
import { roundRM } from '../core/numbers';
import type { SaleRow } from '../core/types';
import { FORECAST_WEEKS, RULES_BY_ID } from '../rules/rules.config';
import type { CashflowInputs, Thresholds } from '../rules/settings';
import type { InvoiceDoc } from './suppliers';
import { findingId, type Finding } from './types';

export interface CashWeek {
  index: number;
  start: string;
  end: string;
  opening: number;
  /** Estimated sales receipts (trend). */
  salesIn: number;
  supplierOut: number;
  /** Part of supplierOut that was already overdue at the start (week 1 only). */
  overdueOut: number;
  supplierRows: number[];
  fixedOut: number;
  fixedItems: { label: string; amount: number; date: string }[];
  restockOut: number;
  closing: number;
  belowMinimum: boolean;
}

export interface CashflowResult {
  weeks: CashWeek[];
  history: { start: string; sales: number }[];
  method: { trendWeeks: number; intercept: number; slope: number; costRatio: number | null; termsWeeks: number; includeRestocking: boolean; assumedPaidBeforeStart: boolean };
  /** True when there is not even one complete week of sales history. */
  insufficientHistory: boolean;
  /** Date the cash-in-bank figure is taken as at (last date in the sales file); week 1 starts the day after. */
  balanceAsOf?: string;
  laterSupplierOut: number;
  lowest?: { start: string; closing: number };
  findings: Finding[];
}

/** Least-squares straight line through y at x = 0..n-1. */
export function linearTrend(y: number[]): { intercept: number; slope: number } {
  const n = y.length;
  if (n === 0) return { intercept: 0, slope: 0 };
  if (n === 1) return { intercept: y[0]!, slope: 0 };
  const mx = (n - 1) / 2;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - mx) * (y[i]! - my);
    den += (i - mx) ** 2;
  }
  const slope = den ? num / den : 0;
  return { intercept: my - slope * mx, slope };
}

export function analyzeCashflow(
  sales: SaleRow[],
  invoices: InvoiceDoc[],
  asOf: string | undefined,
  t: Thresholds,
  inputs: CashflowInputs,
  costRatio: number | null,
  /** Without a payments file, invoices due before the forecast start are assumed paid. */
  hasPayments = true,
): CashflowResult {
  const termsWeeks = Math.round(t.defaultTermsDays / 7);
  const empty: CashflowResult = {
    weeks: [],
    history: [],
    method: { trendWeeks: t.trendWeeks, intercept: 0, slope: 0, costRatio, termsWeeks, includeRestocking: inputs.includeRestocking, assumedPaidBeforeStart: !hasPayments },
    laterSupplierOut: 0,
    insufficientHistory: true,
    findings: [],
  };
  if (!asOf) return empty;

  // The cash-in-bank figure is the balance at the end of asOf (the last date in the sales file).
  // The outlook starts the next day, so days already in the file are never added to it again.
  // History for the trend uses complete Monday–Sunday weeks ending on or before asOf.
  const lastEnd = weekdayMon0(asOf) === 6 ? asOf : addDays(mondayOf(asOf), -1);
  const start = addDays(asOf, 1);
  /** Days of the current week already in the file (0 when the file ends on a Sunday). */
  const elapsedDays = Math.round((Date.parse(start) - Date.parse(addDays(lastEnd, 1))) / 86_400_000);
  const histStart = addDays(lastEnd, 1 - 7 * t.trendWeeks);
  const weekly = new Array<number>(t.trendWeeks).fill(0);
  let firstSale: string | undefined;
  for (const s of sales) {
    if (!firstSale || s.date < firstSale) firstSale = s.date;
    if (s.date < histStart || s.date > lastEnd) continue;
    const idx = Math.floor((Date.parse(s.date) - Date.parse(histStart)) / 604_800_000);
    if (idx >= 0 && idx < weekly.length) weekly[idx]! += s.total;
  }
  // Only use complete weeks on or after the first sale (a short file or partial first week would bias the trend).
  let firstWeek = 0;
  while (firstSale && firstWeek < weekly.length && addDays(histStart, 7 * firstWeek) < firstSale) firstWeek++;
  const used = weekly.slice(firstWeek);
  if (used.length === 0) return { ...empty, insufficientHistory: true };
  const { intercept, slope } = linearTrend(used);
  const history = used.map((v, i) => ({ start: addDays(histStart, 7 * (firstWeek + i)), sales: roundRM(v) }));

  const weeks: CashWeek[] = [];
  for (let k = 0; k < FORECAST_WEEKS; k++) {
    const ws = addDays(start, 7 * k);
    weeks.push({
      index: k + 1,
      start: ws,
      end: addDays(ws, 6),
      opening: 0,
      salesIn: roundRM(Math.max(0, intercept + slope * (used.length + k + elapsedDays / 7))),
      supplierOut: 0,
      overdueOut: 0,
      supplierRows: [],
      fixedOut: 0,
      fixedItems: [],
      restockOut: 0,
      closing: 0,
      belowMinimum: false,
    });
  }
  const windowEnd = weeks[weeks.length - 1]!.end;
  const weekOf = (date: string) => weeks.findIndex((w) => date >= w.start && date <= w.end);

  let later = 0;
  for (const d of invoices) {
    if (d.outstanding <= 0.005) continue;
    if (!hasPayments && d.dueDate < start) continue;
    if (d.dueDate > windowEnd) {
      later += d.outstanding;
      continue;
    }
    const w = d.dueDate < start ? weeks[0]! : weeks[weekOf(d.dueDate)]!;
    w.supplierOut += d.outstanding;
    if (d.dueDate < start) w.overdueOut += d.outstanding;
    w.supplierRows.push(...d.rows);
  }

  // Fixed monthly costs on their day of the month.
  const months: [number, number][] = [];
  for (let y = Number(start.slice(0, 4)), m = Number(start.slice(5, 7)); toISO(y, m, 1) <= windowEnd; m === 12 ? ((m = 1), y++) : m++) months.push([y, m]);
  for (const [y, m] of months) {
    for (const c of inputs.fixedCosts) {
      if (!c.amount) continue;
      const date = toISO(y, m, Math.min(Math.max(1, Math.round(c.dayOfMonth)), daysInMonth(y, m)));
      const idx = weekOf(date);
      if (idx < 0) continue;
      weeks[idx]!.fixedOut += c.amount;
      weeks[idx]!.fixedItems.push({ label: c.label, amount: c.amount, date });
    }
  }
  for (const w of weeks) w.fixedItems.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (inputs.includeRestocking && costRatio !== null && costRatio > 0) {
    for (let k = 0; k < weeks.length; k++) {
      const src = k - termsWeeks;
      if (src >= 0) weeks[k]!.restockOut = roundRM(weeks[src]!.salesIn * costRatio);
    }
  }

  let bal = inputs.openingBalance;
  const findings: Finding[] = [];
  let lowest: CashflowResult['lowest'];
  for (const w of weeks) {
    w.supplierOut = roundRM(w.supplierOut);
    w.overdueOut = roundRM(w.overdueOut);
    w.supplierRows.sort((a, b) => a - b);
    w.opening = roundRM(bal);
    bal = bal + w.salesIn - w.supplierOut - w.fixedOut - w.restockOut;
    w.closing = roundRM(bal);
    w.belowMinimum = w.closing < t.minimumBalance;
    if (!lowest || w.closing < lowest.closing) lowest = { start: w.start, closing: w.closing };
    if (w.belowMinimum) {
      findings.push({
        id: findingId('CSH-02', w.start),
        ruleId: 'CSH-02',
        severity: RULES_BY_ID['CSH-02'].severity as Finding['severity'],
        subject: `${w.start} – ${w.end}`,
        params: { start: w.start, end: w.end, week: w.index, closing: w.closing, minimum: t.minimumBalance, supplierOut: w.supplierOut, fixedOut: w.fixedOut, restockOut: w.restockOut, salesIn: w.salesIn },
        amount: roundRM(t.minimumBalance - w.closing),
        amountKind: 'shortfall',
        estimate: true,
        evidence: w.supplierRows.length ? [{ file: 'invoices', rows: w.supplierRows }] : [],
      });
    }
  }
  return {
    weeks,
    history,
    method: { trendWeeks: t.trendWeeks, intercept: roundRM(intercept), slope: roundRM(slope), costRatio, termsWeeks, includeRestocking: inputs.includeRestocking, assumedPaidBeforeStart: !hasPayments },
    laterSupplierOut: roundRM(later),
    insufficientHistory: false,
    balanceAsOf: asOf,
    lowest,
    findings,
  };
}
