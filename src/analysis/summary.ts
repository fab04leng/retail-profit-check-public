import { roundRM } from '../core/numbers';
import type { CashflowResult } from './cashflow';
import type { ProfitResult } from './profit';
import type { StockResult } from './stock';
import type { SupplierResult } from './suppliers';
import type { Finding } from './types';

export type HeadlineKey = 'slowStock' | 'belowCost' | 'duplicates' | 'payments' | 'cashLow';
export type PageKey = 'profit' | 'stock' | 'suppliers' | 'cashflow';

export interface Headline {
  key: HeadlineKey;
  amount: number;
  count: number;
  /** Findings behind this number (for "show evidence"). */
  findingIds: string[];
  page: PageKey;
  estimate?: boolean;
  params: Record<string, string | number>;
}

const total = (fs: Finding[]) => roundRM(fs.reduce((a, f) => a + (f.amount ?? 0), 0));

/**
 * Value of possible duplicate copies. SUP-01 amounts are already "extra copies". SUP-02 findings are
 * pairs; overlapping pairs (A~B, B~C, A~C) describe one group of same-amount invoices, so each group
 * counts (invoices − 1) × amount — never more than the extra copies, however many pairs it has.
 */
export function duplicateCopiesTotal(fs: Finding[]): number {
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    let r = k;
    while (parent.get(r) !== r) r = parent.get(r) ?? r;
    parent.set(k, r);
    return r;
  };
  const amountOf = new Map<string, number>();
  let sum = 0;
  for (const f of fs) {
    if (f.ruleId !== 'SUP-02') {
      sum += f.amount ?? 0;
      continue;
    }
    const [a, b] = f.id.slice('SUP-02:'.length).split('~');
    if (!a || !b) {
      sum += f.amount ?? 0;
      continue;
    }
    for (const k of [a, b]) if (!parent.has(k)) parent.set(k, k);
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
    amountOf.set(a, f.amount ?? 0);
    amountOf.set(b, f.amount ?? 0);
  }
  const groups = new Map<string, string[]>();
  for (const k of parent.keys()) {
    const r = find(k);
    groups.set(r, [...(groups.get(r) ?? []), k]);
  }
  for (const members of groups.values()) sum += (members.length - 1) * (amountOf.get(members[0]!) ?? 0);
  return roundRM(sum);
}

export function buildSummary(profit: ProfitResult, stock: StockResult, suppliers: SupplierResult, cash: CashflowResult, hasPayments: boolean, slowDays: number, deadDays = 90): Headline[] {
  const out: Headline[] = [];
  if (stock.items.length) {
    // Slow (STK-03) + dead (STK-02) findings add up to exactly this amount.
    out.push({ key: 'slowStock', amount: stock.slowValue, count: stock.slowCount, findingIds: stock.findings.map((f) => f.id), page: 'stock', params: { days: slowDays, deadDays, deadValue: stock.deadValue, deadCount: stock.deadCount, totalValue: stock.totalValue } });
  }
  if (profit.products.length) {
    const below = profit.findings.filter((f) => f.ruleId === 'PRF-02');
    out.push({ key: 'belowCost', amount: total(below), count: below.length, findingIds: below.map((f) => f.id), page: 'profit', params: { grossProfit: profit.totals.grossProfit, margin: profit.totals.marginPct ?? 0 } });
  }
  if (suppliers.invoices.length) {
    const dups = suppliers.findings.filter((f) => f.ruleId === 'SUP-01' || f.ruleId === 'SUP-02');
    out.push({ key: 'duplicates', amount: duplicateCopiesTotal(dups), count: dups.length, findingIds: dups.map((f) => f.id), page: 'suppliers', params: {} });
  }
  if (hasPayments) {
    const over = suppliers.findings.filter((f) => f.ruleId === 'SUP-04');
    const unmatched = suppliers.findings.filter((f) => f.ruleId === 'SUP-05');
    out.push({ key: 'payments', amount: total(over), count: over.length, findingIds: [...over, ...unmatched].map((f) => f.id), page: 'suppliers', params: { unmatchedCount: unmatched.length, unmatchedAmount: total(unmatched) } });
  }
  if (cash.weeks.length && cash.lowest) {
    out.push({ key: 'cashLow', amount: cash.lowest.closing, count: cash.findings.length, findingIds: cash.findings.map((f) => f.id), page: 'cashflow', estimate: true, params: { week: cash.lowest.start } });
  }
  return out;
}
