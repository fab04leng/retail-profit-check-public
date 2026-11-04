/**
 * Compare analysis findings on the demo data with the generator's planted issues.
 * Used by the accuracy test and by scripts/export-demo.ts (answer key).
 */
import { runAll, type AnalysisResult } from '../analysis';
import { normalizeInvoiceNo, normalizeSupplier } from '../analysis/suppliers';
import { buildDataset, stageTable } from '../core/ingest';
import { FILE_KINDS } from '../core/types';
import { defaultSettings, type Settings } from '../rules/settings';
import type { RuleId } from '../rules/rules.config';
import type { DemoData } from './generate';

export interface CategoryCheck {
  label: string;
  ruleId: RuleId;
  expected: string[];
  found: string[];
  missed: string[];
  falsePositives: string[];
}

export function demoSettings(demo: DemoData): Settings {
  const s = defaultSettings();
  s.cashflow = { ...s.cashflow, openingBalance: demo.cashflow.openingBalance, fixedCosts: demo.cashflow.fixedCosts.map((c) => ({ ...c })) };
  return s;
}

export function analyseDemo(demo: DemoData, settings: Settings = demoSettings(demo)): AnalysisResult {
  const staged = Object.fromEntries(FILE_KINDS.map((k) => [k, stageTable(k, `demo-${k}.csv`, demo.tables[k])]));
  return runAll(buildDataset(staged), settings);
}

const sk = (s: string) => s.trim().toUpperCase();
const inv = (supplier: string, no: string) => `${normalizeSupplier(supplier)}|${normalizeInvoiceNo(no)}`;

export function checkAccuracy(demo: DemoData, result: AnalysisResult): CategoryCheck[] {
  const p = demo.planted;
  const byRule = (id: RuleId) => result.findings.filter((f) => f.ruleId === id);
  const cats: { label: string; ruleId: RuleId; expected: string[]; found: string[] }[] = [
    { label: 'Products sold below cost', ruleId: 'PRF-02', expected: p.belowCost.map((x) => sk(x.sku)), found: byRule('PRF-02').map((f) => sk(String(f.params.sku))) },
    { label: 'Margin below target (by design: thin-margin staples)', ruleId: 'PRF-03', expected: p.lowMarginByDesign.map(sk), found: byRule('PRF-03').map((f) => sk(String(f.params.sku))) },
    { label: 'Dead stock', ruleId: 'STK-02', expected: p.deadStock.map((x) => sk(x.sku)), found: byRule('STK-02').map((f) => sk(String(f.params.sku))) },
    { label: 'Duplicate invoice — same number', ruleId: 'SUP-01', expected: p.duplicateSameNumber.map((x) => inv(x.supplier, x.invoiceNo)), found: byRule('SUP-01').map((f) => inv(String(f.params.supplier), String(f.params.invoiceNo))) },
    {
      label: 'Duplicate invoice — same amount within 7 days',
      ruleId: 'SUP-02',
      expected: p.duplicateSameAmount.map((x) => [inv(x.supplier, x.invoiceNos[0]), inv(x.supplier, x.invoiceNos[1])].sort().join(' + ')),
      found: byRule('SUP-02').map((f) => [inv(String(f.params.supplier), String(f.params.invoiceA)), inv(String(f.params.supplier), String(f.params.invoiceB))].sort().join(' + ')),
    },
    { label: 'Supplier price increase > 5%', ruleId: 'SUP-03', expected: p.priceJumps.map((x) => `${normalizeSupplier(x.supplier)}|${sk(x.sku)}`), found: byRule('SUP-03').map((f) => `${normalizeSupplier(String(f.params.supplier))}|${sk(String(f.params.sku))}`) },
    { label: 'Invoice overpaid or paid twice', ruleId: 'SUP-04', expected: p.overpaid.map((x) => `${inv(x.supplier, x.invoiceNo)}|${x.kind}`), found: byRule('SUP-04').map((f) => `${inv(String(f.params.supplier), String(f.params.invoiceNo))}|${f.params.kind}`) },
    { label: 'Payment with no matching invoice', ruleId: 'SUP-05', expected: p.unmatchedPayments.map((x) => `${normalizeSupplier(x.supplier)}|${x.reference}`), found: byRule('SUP-05').map((f) => `${normalizeSupplier(String(f.params.supplier))}|${f.params.reference}`) },
    { label: 'Cash-crunch week', ruleId: 'CSH-02', expected: [p.cashCrunchWeekStart], found: byRule('CSH-02').map((f) => String(f.params.start)) },
  ];
  return cats.map((c) => {
    const exp = new Set(c.expected);
    const fnd = new Set(c.found);
    return { ...c, missed: c.expected.filter((x) => !fnd.has(x)), falsePositives: c.found.filter((x) => !exp.has(x)) };
  });
}
