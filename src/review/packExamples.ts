/**
 * Worked examples for the accountant rule-review pack, computed from the demo
 * data with the real analyses, so every number and row matches the app.
 * Row numbers are spreadsheet rows in demo/data/*.csv (header = row 1).
 */
import type { AnalysisResult } from '../analysis';
import type { Finding } from '../analysis/types';
import { addDays } from '../core/dates';
import { toCsv } from '../core/exportCsv';
import type { FileKind } from '../core/types';
import type { DemoData } from '../demo/generate';
import { formatDate, formatNum, formatPct, formatRM } from '../i18n/format';
import { RULES, type RuleId } from '../rules/rules.config';
import type { Thresholds } from '../rules/settings';
import type { Bilingual, BilingualList, PackLang } from './packNotes';

/** Most source rows printed per table; the rest go to an evidence CSV. */
export const MAX_PRINTED_ROWS = 8;

export const DEMO_FILE_NAMES: Record<FileKind, string> = {
  sales: 'sales.csv',
  products: 'products.csv',
  invoices: 'supplier-invoices.csv',
  payments: 'payments.csv',
};

export interface RowsTable {
  kind: 'rows';
  file: FileKind;
  header: string[];
  /** Printed rows (at most MAX_PRINTED_ROWS). */
  rows: { row: number; cells: string[] }[];
  /** Every row behind the example. */
  allRows: number[];
  /** Set when allRows has more rows than are printed. */
  csvName?: string;
}

export interface CalcTable {
  kind: 'calc';
  title: Bilingual;
  header: BilingualList;
  rows: string[][];
}

export type ExampleTable = RowsTable | CalcTable;

export interface WorkedExample {
  ruleId: RuleId;
  /** Step-by-step calculation, one line per step. */
  steps: BilingualList;
  tables: ExampleTable[];
}

export interface EvidenceFile {
  name: string;
  content: string;
}

/** "2172, 2173, 2174, 2204" → "2172–2174, 2204". */
export function compressRows(rows: number[]): string {
  const sorted = [...new Set(rows)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j]! + 1) j++;
    parts.push(j > i ? `${sorted[i]}–${sorted[j]}` : String(sorted[i]));
    i = j + 1;
  }
  return parts.join(', ');
}

type Fmt = { rm: (n: number) => string; num: (n: number, d?: number) => string; pct: (n: number) => string; date: (iso: string) => string };
const fmt = (lang: PackLang): Fmt => ({
  rm: (n) => formatRM(n, lang),
  num: (n, d = 0) => formatNum(n, lang, d),
  pct: (n) => formatPct(n, lang),
  date: (iso) => formatDate(iso, lang),
});

/** Build a step list in both languages from one function per language. */
function steps(en: (f: Fmt) => string[], zh: (f: Fmt) => string[]): BilingualList {
  return { en: en(fmt('en')), zh: zh(fmt('zh')) };
}

class Builder {
  readonly evidence: EvidenceFile[] = [];
  constructor(private readonly demo: DemoData) {}

  /** Source rows table. `printed` picks which rows to print (default: the first ones). */
  rows(ruleId: RuleId, file: FileKind, allRows: number[], printed?: number[]): RowsTable {
    const table = this.demo.tables[file];
    const all = [...new Set(allRows)].sort((a, b) => a - b);
    const show = (printed ?? all).filter((r) => all.includes(r)).slice(0, MAX_PRINTED_ROWS).sort((a, b) => a - b);
    const header = table[0] ?? [];
    const out: RowsTable = { kind: 'rows', file, header, rows: show.map((row) => ({ row, cells: table[row - 1] ?? [] })), allRows: all };
    if (all.length > show.length) {
      const name = `${ruleId}-${file}.csv`;
      out.csvName = name;
      this.evidence.push({ name, content: toCsv([['Row', ...header], ...all.map((r) => [String(r), ...(table[r - 1] ?? [])])]) });
    }
    return out;
  }
}

function only(result: AnalysisResult, ruleId: RuleId, pick: (f: Finding) => boolean): Finding {
  const f = result.findings.find((x) => x.ruleId === ruleId && pick(x));
  if (!f) throw new Error(`Demo data has no ${ruleId} finding for the worked example`);
  return f;
}

const p = (f: Finding, key: string): number => Number(f.params[key]);
const s = (f: Finding, key: string): string => String(f.params[key] ?? '');
const ev = (f: Finding, file: FileKind): number[] => f.evidence.find((e) => e.file === file)?.rows ?? [];

/** Pick sales rows to print: a few normal lines plus a discounted line and a refund if there are any. */
function sampleSaleRows(demo: DemoData, rows: number[]): number[] {
  const t = demo.tables.sales;
  const discounted = rows.find((r) => Number(t[r - 1]?.[7] ?? 0) > 0);
  const refund = rows.find((r) => Number(t[r - 1]?.[5] ?? 0) < 0);
  const picked = new Set(rows.slice(0, 4));
  if (discounted) picked.add(discounted);
  if (refund) picked.add(refund);
  return [...picked];
}

export function buildExamples(demo: DemoData, result: AnalysisResult, t: Thresholds): { examples: Record<RuleId, WorkedExample>; evidence: EvidenceFile[] } {
  const b = new Builder(demo);
  const asOf = result.asOf ?? demo.end;
  const ex = {} as Record<RuleId, WorkedExample>;
  const sales = demo.tables.sales;

  // ---- PRF-01: a normal product with a discount and a refund among its lines ----
  const prf01 = result.profit.products.find((x) => {
    if (x.marginPct === null || x.marginPct < 25 || x.marginPct > 45 || x.saleRows.length > 200) return false;
    return x.saleRows.some((r) => Number(sales[r - 1]?.[5] ?? 0) < 0) && x.saleRows.some((r) => Number(sales[r - 1]?.[7] ?? 0) > 0);
  });
  if (!prf01 || prf01.unitCost === null || prf01.cogs === null || prf01.grossProfit === null || prf01.marginPct === null) throw new Error('No PRF-01 example product');
  {
    const x = prf01;
    const refunds = x.saleRows.filter((r) => Number(sales[r - 1]?.[5] ?? 0) < 0).length;
    ex['PRF-01'] = {
      ruleId: 'PRF-01',
      steps: steps(
        (f) => [
          `Product ${x.sku} ${x.name}: ${f.num(x.saleRows.length)} sales lines in the period, including ${f.num(refunds)} refund ${refunds === 1 ? 'line' : 'lines'} (negative quantity).`,
          `Revenue = sum of line totals after discount, refunds negative = ${f.rm(x.revenue)}.`,
          `Net units sold = ${f.num(x.units)}. Unit cost (products row ${x.productRows.join(', ')}) = ${f.rm(x.unitCost!)}.`,
          `Cost of goods sold = ${f.num(x.units)} × ${f.rm(x.unitCost!)} = ${f.rm(x.cogs!)}.`,
          `Gross profit = ${f.rm(x.revenue)} − ${f.rm(x.cogs!)} = ${f.rm(x.grossProfit!)}. Margin = ${f.rm(x.grossProfit!)} ÷ ${f.rm(x.revenue)} = ${f.pct(x.marginPct!)}.`,
        ],
        (f) => [
          `产品 ${x.sku} ${x.name}：期间内共有 ${f.num(x.saleRows.length)} 行销售，其中 ${f.num(refunds)} 行是退货（数量为负数）。`,
          `销售额 = 扣除折扣后的各行总额相加，退货为负数 = ${f.rm(x.revenue)}。`,
          `净卖出数量 = ${f.num(x.units)}。单位成本（产品第 ${x.productRows.join(', ')} 行）= ${f.rm(x.unitCost!)}。`,
          `销货成本 = ${f.num(x.units)} × ${f.rm(x.unitCost!)} = ${f.rm(x.cogs!)}。`,
          `毛利 = ${f.rm(x.revenue)} − ${f.rm(x.cogs!)} = ${f.rm(x.grossProfit!)}。毛利率 = ${f.rm(x.grossProfit!)} ÷ ${f.rm(x.revenue)} = ${f.pct(x.marginPct!)}。`,
        ],
      ),
      tables: [b.rows('PRF-01', 'products', x.productRows), b.rows('PRF-01', 'sales', x.saleRows, sampleSaleRows(demo, x.saleRows))],
    };
  }

  // ---- PRF-02: the product whose supplier cost rose (also shows the main false positive) ----
  {
    const f2 = only(result, 'PRF-02', (f) => s(f, 'sku') === 'CT-002');
    const rise = only(result, 'SUP-03', (f) => s(f, 'sku') === 'CT-002');
    const units = p(f2, 'units');
    ex['PRF-02'] = {
      ruleId: 'PRF-02',
      steps: steps(
        (f) => [
          `Product ${s(f2, 'sku')} ${s(f2, 'name')}: ${f.num(units)} net units sold for ${f.rm(p(f2, 'revenue'))} → average selling price ${f.rm(p(f2, 'avgPrice'))} per unit.`,
          `Unit cost in the product list = ${f.rm(p(f2, 'unitCost'))}. Average price < unit cost → flagged.`,
          `Amount below cost = cost of goods sold ${f.rm(p(f2, 'cogs'))} − revenue ${f.rm(p(f2, 'revenue'))} = ${f.rm(f2.amount ?? 0)}.`,
          `Check before agreeing: the supplier invoices show the cost rose from ${f.rm(p(rise, 'prevPrice'))} (${f.date(s(rise, 'prevDate'))}) to ${f.rm(p(rise, 'newPrice'))} (${f.date(s(rise, 'newDate'))}). Sales before the rise were compared with the new cost, so part of this amount is the cost rise, not a pricing mistake.`,
        ],
        (f) => [
          `产品 ${s(f2, 'sku')} ${s(f2, 'name')}：净卖出 ${f.num(units)} 个，销售额 ${f.rm(p(f2, 'revenue'))} → 平均售价每个 ${f.rm(p(f2, 'avgPrice'))}。`,
          `产品清单中的单位成本 = ${f.rm(p(f2, 'unitCost'))}。平均售价 < 单位成本 → 标出。`,
          `低于成本的金额 = 销货成本 ${f.rm(p(f2, 'cogs'))} − 销售额 ${f.rm(p(f2, 'revenue'))} = ${f.rm(f2.amount ?? 0)}。`,
          `同意之前请核对：供应商发票显示成本从 ${f.rm(p(rise, 'prevPrice'))}（${f.date(s(rise, 'prevDate'))}）涨到 ${f.rm(p(rise, 'newPrice'))}（${f.date(s(rise, 'newDate'))}）。涨价前的销售也拿新成本来比较，所以这笔金额有一部分是成本上涨，不是定价错误。`,
        ],
      ),
      tables: [
        b.rows('PRF-02', 'products', ev(f2, 'products')),
        b.rows('PRF-02', 'sales', ev(f2, 'sales'), sampleSaleRows(demo, ev(f2, 'sales'))),
        b.rows('PRF-02', 'invoices', ev(rise, 'invoices')),
      ],
    };
  }

  // ---- PRF-03: a thin-margin staple ----
  {
    const f3 = only(result, 'PRF-03', (f) => s(f, 'sku') === 'RG-002');
    const target = p(f3, 'target');
    ex['PRF-03'] = {
      ruleId: 'PRF-03',
      steps: steps(
        (f) => [
          `Product ${s(f3, 'sku')} ${s(f3, 'name')}: revenue ${f.rm(p(f3, 'revenue'))}, gross profit ${f.rm(p(f3, 'grossProfit'))} → margin ${f.pct(p(f3, 'margin'))}.`,
          `Target margin = ${f.pct(target)}. ${f.pct(p(f3, 'margin'))} < ${f.pct(target)} and the product makes a profit → flagged (not PRF-02).`,
          `Amount shown = gross profit at target (${f.pct(target)} × ${f.rm(p(f3, 'revenue'))}) − actual gross profit = ${f.rm(f3.amount ?? 0)}. This is profit short of target, not a loss.`,
        ],
        (f) => [
          `产品 ${s(f3, 'sku')} ${s(f3, 'name')}：销售额 ${f.rm(p(f3, 'revenue'))}，毛利 ${f.rm(p(f3, 'grossProfit'))} → 毛利率 ${f.pct(p(f3, 'margin'))}。`,
          `目标毛利率 = ${f.pct(target)}。${f.pct(p(f3, 'margin'))} < ${f.pct(target)}，而且产品有赚钱 → 标出（不属于 PRF-02）。`,
          `显示的金额 = 按目标计算的毛利（${f.pct(target)} × ${f.rm(p(f3, 'revenue'))}）− 实际毛利 = ${f.rm(f3.amount ?? 0)}。这是未达目标的毛利，不是亏损。`,
        ],
      ),
      tables: [b.rows('PRF-03', 'products', ev(f3, 'products')), b.rows('PRF-03', 'sales', ev(f3, 'sales'), sampleSaleRows(demo, ev(f3, 'sales')))],
    };
  }

  // ---- STK-01 and STK-04: one recently sold product ----
  const item = result.stock.items.find((i) => i.ageBasis === 'lastSale' && i.bucket === '0-30' && i.qtyOnHand > 0 && i.coverDays !== null && i.coverDays > 20 && i.coverDays < 60 && i.lastSaleRow);
  if (!item || item.lastSale === undefined || item.lastSaleRow === undefined || item.ageDays === null || item.coverDays === null) throw new Error('No STK-01 example item');
  ex['STK-01'] = {
    ruleId: 'STK-01',
    steps: steps(
      (f) => [
        `Analysis date = latest sale date in the sales file = ${f.date(asOf)}.`,
        `Product ${item.sku} ${item.name}: last sale ${f.date(item.lastSale!)} (sales row ${item.lastSaleRow}) → age ${f.num(item.ageDays!)} days → group "${item.bucket}" days.`,
        `Stock value = ${f.num(item.qtyOnHand)} on hand × ${f.rm(item.unitCost)} = ${f.rm(item.value)}.`,
      ],
      (f) => [
        `分析日期 = 销售文件中最后的销售日期 = ${f.date(asOf)}。`,
        `产品 ${item.sku} ${item.name}：最后一次销售在 ${f.date(item.lastSale!)}（销售第 ${item.lastSaleRow} 行）→ 库龄 ${f.num(item.ageDays!)} 天 → 分组“${item.bucket}”天。`,
        `库存价值 = 现有 ${f.num(item.qtyOnHand)} × ${f.rm(item.unitCost)} = ${f.rm(item.value)}。`,
      ],
    ),
    tables: [b.rows('STK-01', 'products', item.productRows), b.rows('STK-01', 'sales', [item.lastSaleRow])],
  };
  {
    const from = addDays(asOf, -t.coverLookbackDays + 1);
    const key = item.sku.trim().toUpperCase();
    const lookRows: number[] = [];
    sales.forEach((r, i) => {
      if (i === 0 || (r[2] ?? '').trim().toUpperCase() !== key) return;
      const [d, m, y] = (r[0] ?? '').split('/');
      const iso = `${y}-${m}-${d}`;
      if (iso >= from && iso <= asOf) lookRows.push(i + 1);
    });
    ex['STK-04'] = {
      ruleId: 'STK-04',
      steps: steps(
        (f) => [
          `Look-back = ${f.num(t.coverLookbackDays)} days: ${f.date(from)} to ${f.date(asOf)}.`,
          `Product ${item.sku}: ${f.num(item.unitsLookback)} net units sold in ${f.num(lookRows.length)} sales lines → ${f.num(item.unitsLookback)} ÷ ${f.num(t.coverLookbackDays)} = ${f.num(item.avgDailyUnits, 2)} units per day.`,
          `Days of cover = ${f.num(item.qtyOnHand)} on hand ÷ ${f.num(item.avgDailyUnits, 2)} = ${f.num(item.coverDays!)} days (rounded).`,
        ],
        (f) => [
          `回顾期间 = ${f.num(t.coverLookbackDays)} 天：${f.date(from)} 至 ${f.date(asOf)}。`,
          `产品 ${item.sku}：在 ${f.num(lookRows.length)} 行销售中净卖出 ${f.num(item.unitsLookback)} 个 → ${f.num(item.unitsLookback)} ÷ ${f.num(t.coverLookbackDays)} = 每天 ${f.num(item.avgDailyUnits, 2)} 个。`,
          `可卖天数 = 现有 ${f.num(item.qtyOnHand)} ÷ ${f.num(item.avgDailyUnits, 2)} = ${f.num(item.coverDays!)} 天（四舍五入）。`,
        ],
      ),
      tables: [b.rows('STK-04', 'products', item.productRows), b.rows('STK-04', 'sales', lookRows)],
    };
  }

  // ---- STK-02 and STK-03 ----
  const stockExample = (ruleId: 'STK-02' | 'STK-03', sku: string): WorkedExample => {
    const f0 = only(result, ruleId, (f) => s(f, 'sku') === sku);
    const threshold = p(f0, 'threshold');
    const deadNote = ruleId === 'STK-03';
    return {
      ruleId,
      steps: steps(
        (f) => [
          `Product ${sku} ${s(f0, 'name')}: last sale ${f.date(s(f0, 'lastSale'))} (sales row ${ev(f0, 'sales').join(', ')}). Analysis date ${f.date(asOf)} → ${f.num(p(f0, 'days'))} days without a sale.`,
          `${f.num(p(f0, 'days'))} > ${f.num(threshold)} days${deadNote ? ` and not more than ${f.num(t.deadStockDays)} (dead stock)` : ''}, with ${f.num(p(f0, 'qty'))} on hand → flagged.`,
          `Stock value = ${f.num(p(f0, 'qty'))} × ${f.rm(p(f0, 'unitCost'))} = ${f.rm(f0.amount ?? 0)}.`,
        ],
        (f) => [
          `产品 ${sku} ${s(f0, 'name')}：最后一次销售在 ${f.date(s(f0, 'lastSale'))}（销售第 ${ev(f0, 'sales').join(', ')} 行）。分析日期 ${f.date(asOf)} → 已 ${f.num(p(f0, 'days'))} 天没有销售。`,
          `${f.num(p(f0, 'days'))} > ${f.num(threshold)} 天${deadNote ? `，而且不超过 ${f.num(t.deadStockDays)} 天（死货）` : ''}，现有库存 ${f.num(p(f0, 'qty'))} → 标出。`,
          `库存价值 = ${f.num(p(f0, 'qty'))} × ${f.rm(p(f0, 'unitCost'))} = ${f.rm(f0.amount ?? 0)}。`,
        ],
      ),
      tables: [b.rows(ruleId, 'products', ev(f0, 'products')), b.rows(ruleId, 'sales', ev(f0, 'sales'))],
    };
  };
  ex['STK-02'] = stockExample('STK-02', 'FS-007');
  ex['STK-03'] = stockExample('STK-03', 'RG-009');

  // ---- STK-05 ----
  {
    const r = result.reorder[0];
    const si = r && result.stock.items.find((i) => i.sku === r.sku);
    if (!r || !si) throw new Error('No STK-05 example');
    const selling = result.stock.items.filter((i) => i.unitsLookback > 0).sort((a, c) => c.unitsLookback - a.unitsLookback);
    const rank = selling.findIndex((i) => i.sku === r.sku) + 1;
    const fastCount = Math.max(1, Math.ceil(selling.length * 0.2));
    ex['STK-05'] = {
      ruleId: 'STK-05',
      steps: steps(
        (f) => [
          `${f.num(selling.length)} products sold in the look-back; the top 20% by units (${f.num(fastCount)} products) are fast movers. ${r.sku} ${r.name} is number ${f.num(rank)}.`,
          `${f.num(si.unitsLookback)} units in ${f.num(t.coverLookbackDays)} days = ${f.num(si.avgDailyUnits, 2)} per day. Cover = ${f.num(r.qtyOnHand)} ÷ ${f.num(si.avgDailyUnits, 2)} = ${f.num(r.coverDays)} days, below the reorder point of ${f.num(t.reorderBelowCoverDays)}.`,
          `Suggested quantity = ${f.num(si.avgDailyUnits, 2)} × ${f.num(t.reorderTargetCoverDays)} days − ${f.num(r.qtyOnHand)} on hand = ${f.num(r.suggestedQty)} (rounded up). Cash needed at cost: ${f.rm(r.value)}.`,
        ],
        (f) => [
          `回顾期内有 ${f.num(selling.length)} 种产品有销售；按数量排前 20%（${f.num(fastCount)} 种）是畅销货。${r.sku} ${r.name} 排第 ${f.num(rank)}。`,
          `${f.num(t.coverLookbackDays)} 天卖出 ${f.num(si.unitsLookback)} 个 = 每天 ${f.num(si.avgDailyUnits, 2)} 个。可卖天数 = ${f.num(r.qtyOnHand)} ÷ ${f.num(si.avgDailyUnits, 2)} = ${f.num(r.coverDays)} 天，低于 ${f.num(t.reorderBelowCoverDays)} 天的补货点。`,
          `建议数量 = ${f.num(si.avgDailyUnits, 2)} × ${f.num(t.reorderTargetCoverDays)} 天 − 现有 ${f.num(r.qtyOnHand)} = ${f.num(r.suggestedQty)}（向上取整）。按成本需要的现金：${f.rm(r.value)}。`,
        ],
      ),
      tables: [b.rows('STK-05', 'products', r.productRows)],
    };
  }

  // ---- SUP-01 ----
  {
    const f1 = only(result, 'SUP-01', (f) => s(f, 'invoiceNo') === 'HP-01155');
    ex['SUP-01'] = {
      ruleId: 'SUP-01',
      steps: steps(
        (f) => [
          `${s(f1, 'supplier')}, invoice ${s(f1, 'invoiceNo')}: the same number appears on ${s(f1, 'dates').split(', ').map(f.date).join(' and ')} (rows below).`,
          `Same supplier + same invoice number on different dates → flagged. Amount = total of the extra copy = ${f.rm(f1.amount ?? 0)}.`,
        ],
        (f) => [
          `${s(f1, 'supplier')}，发票 ${s(f1, 'invoiceNo')}：同一个号码出现在 ${s(f1, 'dates').split(', ').map(f.date).join(' 和 ')}（见下表各行）。`,
          `同一供应商 + 同一发票号码出现在不同日期 → 标出。金额 = 多出来那一份的总额 = ${f.rm(f1.amount ?? 0)}。`,
        ],
      ),
      tables: [b.rows('SUP-01', 'invoices', ev(f1, 'invoices'))],
    };
  }

  // ---- SUP-02 ----
  {
    const f2 = only(result, 'SUP-02', (f) => s(f, 'supplier') === 'Rotimas Bakery Supply');
    ex['SUP-02'] = {
      ruleId: 'SUP-02',
      steps: steps(
        (f) => [
          `${s(f2, 'supplier')}: invoice ${s(f2, 'invoiceA')} (${f.date(s(f2, 'dateA'))}) and invoice ${s(f2, 'invoiceB')} (${f.date(s(f2, 'dateB'))}) each total ${f.rm(p(f2, 'total'))}.`,
          `Different numbers, exactly the same total, ${f.num(p(f2, 'days'))} days apart (window: ${f.num(t.duplicateWindowDays)} days) → flagged.`,
        ],
        (f) => [
          `${s(f2, 'supplier')}：发票 ${s(f2, 'invoiceA')}（${f.date(s(f2, 'dateA'))}）和发票 ${s(f2, 'invoiceB')}（${f.date(s(f2, 'dateB'))}）的总额都是 ${f.rm(p(f2, 'total'))}。`,
          `号码不同、总额完全相同、相隔 ${f.num(p(f2, 'days'))} 天（范围：${f.num(t.duplicateWindowDays)} 天）→ 标出。`,
        ],
      ),
      tables: [b.rows('SUP-02', 'invoices', ev(f2, 'invoices'))],
    };
  }

  // ---- SUP-03 ----
  {
    const f3 = only(result, 'SUP-03', (f) => s(f, 'sku') === 'CT-002');
    ex['SUP-03'] = {
      ruleId: 'SUP-03',
      steps: steps(
        (f) => [
          `${s(f3, 'supplier')}, ${s(f3, 'sku')} ${s(f3, 'item')}: previous unit price ${f.rm(p(f3, 'prevPrice'))} (${f.date(s(f3, 'prevDate'))}), new unit price ${f.rm(p(f3, 'newPrice'))} (${f.date(s(f3, 'newDate'))}, invoice ${s(f3, 'invoiceNo')}).`,
          `Rise = (${f.rm(p(f3, 'newPrice'))} − ${f.rm(p(f3, 'prevPrice'))}) ÷ ${f.rm(p(f3, 'prevPrice'))} = ${f.pct(p(f3, 'pct'))}, more than ${f.pct(t.priceIncreasePct)} → flagged.`,
          `Extra cost on the newer invoice = price difference × ${f.num(p(f3, 'qty'))} units = ${f.rm(f3.amount ?? 0)}.`,
        ],
        (f) => [
          `${s(f3, 'supplier')}，${s(f3, 'sku')} ${s(f3, 'item')}：上一次单价 ${f.rm(p(f3, 'prevPrice'))}（${f.date(s(f3, 'prevDate'))}），新单价 ${f.rm(p(f3, 'newPrice'))}（${f.date(s(f3, 'newDate'))}，发票 ${s(f3, 'invoiceNo')}）。`,
          `涨幅 = (${f.rm(p(f3, 'newPrice'))} − ${f.rm(p(f3, 'prevPrice'))}) ÷ ${f.rm(p(f3, 'prevPrice'))} = ${f.pct(p(f3, 'pct'))}，超过 ${f.pct(t.priceIncreasePct)} → 标出。`,
          `较新发票上的额外成本 = 差价 × ${f.num(p(f3, 'qty'))} 个 = ${f.rm(f3.amount ?? 0)}。`,
        ],
      ),
      tables: [b.rows('SUP-03', 'invoices', ev(f3, 'invoices'))],
    };
  }

  // ---- SUP-04 ----
  {
    const f4 = only(result, 'SUP-04', (f) => s(f, 'kind') === 'paidTwice');
    ex['SUP-04'] = {
      ruleId: 'SUP-04',
      steps: steps(
        (f) => [
          `${s(f4, 'supplier')}, invoice ${s(f4, 'invoiceNo')}: total of the invoice lines = ${f.rm(p(f4, 'total'))}.`,
          `${f.num(p(f4, 'count'))} payments were matched to it (payments rows ${ev(f4, 'payments').join(', ')}), by the reference containing the invoice number or by the same amount after the invoice date. They add up to ${f.rm(p(f4, 'paid'))}.`,
          `${f.rm(p(f4, 'paid'))} − ${f.rm(p(f4, 'total'))} = ${f.rm(f4.amount ?? 0)}, more than the ${f.rm(t.paymentTolerance)} tolerance → flagged as possibly paid twice.`,
        ],
        (f) => [
          `${s(f4, 'supplier')}，发票 ${s(f4, 'invoiceNo')}：发票各行总额 = ${f.rm(p(f4, 'total'))}。`,
          `有 ${f.num(p(f4, 'count'))} 笔付款对应到这张发票（付款第 ${ev(f4, 'payments').join(', ')} 行），依据是参考号包含发票号码，或在发票日期之后金额相同。合计 ${f.rm(p(f4, 'paid'))}。`,
          `${f.rm(p(f4, 'paid'))} − ${f.rm(p(f4, 'total'))} = ${f.rm(f4.amount ?? 0)}，超过 ${f.rm(t.paymentTolerance)} 的容差 → 标出为可能付了两次。`,
        ],
      ),
      tables: [b.rows('SUP-04', 'invoices', ev(f4, 'invoices')), b.rows('SUP-04', 'payments', ev(f4, 'payments'))],
    };
  }

  // ---- SUP-05 ----
  {
    const f5 = only(result, 'SUP-05', (f) => s(f, 'reference') === 'BS-99871');
    ex['SUP-05'] = {
      ruleId: 'SUP-05',
      steps: steps(
        (f) => [
          `Payment of ${f.rm(p(f5, 'amount'))} to ${s(f5, 'supplier')} on ${f.date(s(f5, 'date'))}, reference "${s(f5, 'reference')}" (payments row ${ev(f5, 'payments').join(', ')}).`,
          `No invoice from this supplier has a number in the reference, and no unpaid invoice from this supplier has exactly this amount within ${f.num(t.paymentMatchWindowDays)} days before the payment → flagged.`,
        ],
        (f) => [
          `${f.date(s(f5, 'date'))} 付给 ${s(f5, 'supplier')} 的 ${f.rm(p(f5, 'amount'))}，参考“${s(f5, 'reference')}”（付款第 ${ev(f5, 'payments').join(', ')} 行）。`,
          `这个供应商没有任何发票号码出现在参考号里，也没有在付款前 ${f.num(t.paymentMatchWindowDays)} 天内金额完全相同的未付发票 → 标出。`,
        ],
      ),
      tables: [b.rows('SUP-05', 'payments', ev(f5, 'payments'))],
    };
  }

  // ---- CSH-01 ----
  {
    const cf = result.cashflow;
    const m = cf.method;
    const rm = (n: number) => formatRM(n, 'en');
    ex['CSH-01'] = {
      ruleId: 'CSH-01',
      steps: steps(
        (f) => [
          `Weekly sales of the last ${f.num(cf.history.length)} complete weeks (table 1) → straight line: week sales ≈ ${f.rm(m.intercept)} + ${f.rm(m.slope)} × week number (0 = first week in table 1; the forecast continues the count).`,
          `Inputs for the demo shop: cash in bank ${f.rm(demo.cashflow.openingBalance)}; ${demo.cashflow.fixedCosts.map((c) => `${c.label} ${f.rm(c.amount)} on day ${c.dayOfMonth}`).join('; ')}.`,
          `Unpaid supplier invoices fall in the week they are due. Restocking = forecast sales × cost ratio ${f.pct((m.costRatio ?? 0) * 100)}, paid ${f.num(m.termsWeeks)} weeks later (default terms ${f.num(t.defaultTermsDays)} days).`,
          `Closing = opening + sales in − supplier invoices − fixed costs − restocking (table 2).`,
        ],
        (f) => [
          `最近 ${f.num(cf.history.length)} 个完整周的每周销售（表 1）→ 直线：每周销售 ≈ ${f.rm(m.intercept)} + ${f.rm(m.slope)} × 周数（表 1 第一周为 0；预测接着往下数）。`,
          `示范店的输入：银行现金 ${f.rm(demo.cashflow.openingBalance)}；${demo.cashflow.fixedCosts.map((c) => `${c.label} ${f.rm(c.amount)}，每月 ${c.dayOfMonth} 日`).join('；')}。`,
          `未付的供应商发票放在到期的那一周。补货开销 = 预测销售 × 成本比率 ${f.pct((m.costRatio ?? 0) * 100)}，在 ${f.num(m.termsWeeks)} 周后支付（默认付款期限 ${f.num(t.defaultTermsDays)} 天）。`,
          `期末结余 = 期初 + 销售流入 − 供应商发票 − 固定开销 − 补货开销（表 2）。`,
        ],
      ),
      tables: [
        {
          kind: 'calc',
          title: { en: 'Table 1: weekly sales used for the trend', zh: '表 1：用于趋势的每周销售' },
          header: { en: ['Week from', 'Sales'], zh: ['周开始', '销售'] },
          rows: cf.history.map((h) => [h.start, rm(h.sales)]),
        },
        {
          kind: 'calc',
          title: { en: 'Table 2: 8-week outlook', zh: '表 2：8 周展望' },
          header: {
            en: ['Week from', 'Opening', 'Sales in', 'Supplier invoices', 'Fixed costs', 'Restocking', 'Closing'],
            zh: ['周开始', '期初', '销售流入', '供应商发票', '固定开销', '补货', '期末'],
          },
          rows: cf.weeks.map((w) => [w.start, rm(w.opening), rm(w.salesIn), rm(w.supplierOut), rm(w.fixedOut), rm(w.restockOut), rm(w.closing)]),
        },
      ],
    };
  }

  // ---- CSH-02 ----
  {
    const f6 = only(result, 'CSH-02', () => true);
    const w = result.cashflow.weeks.find((x) => x.start === s(f6, 'start'));
    if (!w) throw new Error('No CSH-02 week');
    ex['CSH-02'] = {
      ruleId: 'CSH-02',
      steps: steps(
        (f) => [
          `Week ${f.num(w.index)} (${f.date(w.start)} – ${f.date(w.end)}): opening ${f.rm(w.opening)} + sales in ${f.rm(w.salesIn)} − supplier invoices due ${f.rm(w.supplierOut)} − fixed costs ${f.rm(w.fixedOut)} − restocking ${f.rm(w.restockOut)} = closing ${f.rm(w.closing)}.`,
          `${f.rm(w.closing)} is below the minimum balance of ${f.rm(t.minimumBalance)} → flagged. Shortfall ${f.rm(f6.amount ?? 0)} (an estimate).`,
          `The supplier invoices due that week are ${f.num(w.supplierRows.length)} invoice lines (sample below; all rows in the evidence file).`,
        ],
        (f) => [
          `第 ${f.num(w.index)} 周（${f.date(w.start)} – ${f.date(w.end)}）：期初 ${f.rm(w.opening)} + 销售流入 ${f.rm(w.salesIn)} − 到期供应商发票 ${f.rm(w.supplierOut)} − 固定开销 ${f.rm(w.fixedOut)} − 补货 ${f.rm(w.restockOut)} = 期末 ${f.rm(w.closing)}。`,
          `${f.rm(w.closing)} 低于 ${f.rm(t.minimumBalance)} 的最低结余 → 标出。短缺 ${f.rm(f6.amount ?? 0)}（估计）。`,
          `当周到期的供应商发票共 ${f.num(w.supplierRows.length)} 行（下表为部分；所有行见证据文件）。`,
        ],
      ),
      tables: [b.rows('CSH-02', 'invoices', w.supplierRows)],
    };
  }

  for (const r of RULES) if (!ex[r.id]) throw new Error(`No worked example for ${r.id}`);
  return { examples: ex, evidence: b.evidence };
}
