import type { Dataset } from '../core/types';
import type { Settings } from '../rules/settings';
import { analyzeCashflow, type CashflowResult } from './cashflow';
import { analyzeProfit, type ProfitResult } from './profit';
import { analyzeStock, type StockResult } from './stock';
import { buildSummary, type Headline } from './summary';
import { analyzeSuppliers, type SupplierResult } from './suppliers';
import type { Finding } from './types';

export interface AnalysisResult {
  asOf?: string;
  period?: { from: string; to: string };
  profit: ProfitResult;
  stock: StockResult;
  suppliers: SupplierResult;
  cashflow: CashflowResult;
  summary: Headline[];
  findings: Finding[];
  counts: { sales: number; products: number; invoiceLines: number; payments: number };
}

/** Run every analysis. Pure: same dataset + settings → same result. */
export function runAll(ds: Dataset, settings: Settings): AnalysisResult {
  const t = settings.thresholds;
  const profit = analyzeProfit(ds.sales, ds.products, t);
  const stock = analyzeStock(ds.sales, ds.products, t);
  const suppliers = analyzeSuppliers(ds.invoices, ds.payments, ds.hasPayments, t);
  const costRatio = profit.totals.revenue > 0 ? profit.totals.cogs / profit.totals.revenue : null;
  const cashflow = analyzeCashflow(ds.sales, suppliers.invoices, stock.asOf, t, settings.cashflow, costRatio, ds.hasPayments);
  const summary = buildSummary(profit, stock, suppliers, cashflow, ds.hasPayments, t.slowStockDays);
  let from: string | undefined;
  for (const s of ds.sales) if (!from || s.date < from) from = s.date;
  return {
    asOf: stock.asOf,
    period: from && stock.asOf ? { from, to: stock.asOf } : undefined,
    profit,
    stock,
    suppliers,
    cashflow,
    summary,
    findings: [...profit.findings, ...stock.findings, ...suppliers.findings, ...cashflow.findings],
    counts: { sales: ds.sales.length, products: ds.products.length, invoiceLines: ds.invoices.length, payments: ds.payments.length },
  };
}
