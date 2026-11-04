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

export function buildSummary(profit: ProfitResult, stock: StockResult, suppliers: SupplierResult, cash: CashflowResult, hasPayments: boolean, slowDays: number): Headline[] {
  const out: Headline[] = [];
  if (stock.items.length) {
    const dead = stock.findings;
    out.push({ key: 'slowStock', amount: stock.slowValue, count: stock.slowCount, findingIds: dead.map((f) => f.id), page: 'stock', params: { days: slowDays, deadValue: stock.deadValue, deadCount: stock.deadCount, totalValue: stock.totalValue } });
  }
  if (profit.products.length) {
    const below = profit.findings.filter((f) => f.ruleId === 'PRF-02');
    out.push({ key: 'belowCost', amount: total(below), count: below.length, findingIds: below.map((f) => f.id), page: 'profit', params: { grossProfit: profit.totals.grossProfit, margin: profit.totals.marginPct ?? 0 } });
  }
  if (suppliers.invoices.length) {
    const dups = suppliers.findings.filter((f) => f.ruleId === 'SUP-01' || f.ruleId === 'SUP-02');
    out.push({ key: 'duplicates', amount: total(dups), count: dups.length, findingIds: dups.map((f) => f.id), page: 'suppliers', params: {} });
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
