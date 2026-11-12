import { roundRM } from '../core/numbers';
import type { ProductRow, SaleRow } from '../core/types';
import { RULES_BY_ID } from '../rules/rules.config';
import type { Thresholds } from '../rules/settings';
import { skuKey } from './keys';
import { findingId, type Finding } from './types';

export interface ProductProfit {
  sku: string;
  name: string;
  category: string;
  /** Net units (sales minus refunds). */
  units: number;
  revenue: number;
  unitCost: number | null;
  cogs: number | null;
  grossProfit: number | null;
  marginPct: number | null;
  avgPrice: number | null;
  saleRows: number[];
  productRows: number[];
}

export interface GroupProfit {
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPct: number | null;
  /** Revenue from products with no cost in the product list (excluded from cogs/margin). */
  revenueWithoutCost: number;
}

export interface CategoryProfit extends GroupProfit {
  category: string;
  skuCount: number;
}

export interface OutletProfit extends GroupProfit {
  outlet: string;
  receipts: number;
  units: number;
  avgReceipt: number | null;
}

export interface ProfitResult {
  products: ProductProfit[];
  categories: CategoryProfit[];
  outlets: OutletProfit[];
  totals: GroupProfit;
  unknownSkus: { sku: string; name: string; revenue: number; rows: number[] }[];
  findings: Finding[];
}

const pct = (gp: number, rev: number): number | null => (rev > 0 ? roundRM((gp / rev) * 100) : null);

function emptyGroup(): GroupProfit {
  return { revenue: 0, cogs: 0, grossProfit: 0, marginPct: null, revenueWithoutCost: 0 };
}

export function analyzeProfit(sales: SaleRow[], products: ProductRow[], t: Thresholds): ProfitResult {
  // Products with unit cost 0 are treated as "no cost" (usually an unset cost, not a free item).
  const productByKey = new Map<string, ProductRow>();
  for (const p of products) productByKey.set(skuKey(p.sku), p);
  const costOf = (p: ProductRow | undefined): number | null => (p && p.unitCost > 0 ? p.unitCost : null);

  interface Acc { sku: string; name: string; category: string; units: number; revenue: number; rows: number[] }
  const acc = new Map<string, Acc>();
  const outletAcc = new Map<string, { revenue: number; cogs: number; noCost: number; receipts: Set<string>; units: number }>();
  for (const s of sales) {
    const key = skuKey(s.sku);
    let a = acc.get(key);
    if (!a) {
      const p = productByKey.get(key);
      a = { sku: p?.sku ?? s.sku.trim(), name: p?.name ?? s.name, category: p?.category ?? s.category, units: 0, revenue: 0, rows: [] };
      acc.set(key, a);
    }
    a.units += s.qty;
    a.revenue += s.total;
    a.rows.push(s.row);
    const outlet = s.outlet || '—';
    let o = outletAcc.get(outlet);
    if (!o) outletAcc.set(outlet, (o = { revenue: 0, cogs: 0, noCost: 0, receipts: new Set(), units: 0 }));
    o.revenue += s.total;
    o.units += s.qty;
    if (s.receipt) o.receipts.add(`${s.date}|${s.receipt}`); // POS receipt numbers often restart daily
    const c = costOf(productByKey.get(key));
    if (c !== null) o.cogs += s.qty * c;
    else o.noCost += s.total;
  }

  const result: ProductProfit[] = [];
  const unknownSkus: ProfitResult['unknownSkus'] = [];
  for (const [key, a] of acc) {
    const p = productByKey.get(key);
    const cost = costOf(p);
    const revenue = roundRM(a.revenue);
    const cogs = cost !== null ? roundRM(a.units * cost) : null;
    const gp = cogs === null ? null : roundRM(revenue - cogs);
    result.push({
      sku: a.sku,
      name: a.name,
      category: a.category,
      units: a.units,
      revenue,
      unitCost: cost,
      cogs,
      grossProfit: gp,
      marginPct: gp === null ? null : pct(gp, revenue),
      avgPrice: a.units > 0 ? roundRM(revenue / a.units) : null,
      saleRows: a.rows,
      productRows: p ? p.rows : [],
    });
    if (!p) unknownSkus.push({ sku: a.sku, name: a.name, revenue, rows: a.rows });
  }
  // Best first: by gross profit (products without cost go last, by revenue).
  result.sort((x, y) => (y.grossProfit ?? -Infinity) - (x.grossProfit ?? -Infinity) || y.revenue - x.revenue || x.sku.localeCompare(y.sku));

  const cats = new Map<string, CategoryProfit>();
  const totals = emptyGroup();
  for (const r of result) {
    let c = cats.get(r.category);
    if (!c) cats.set(r.category, (c = { category: r.category, skuCount: 0, ...emptyGroup() }));
    c.skuCount++;
    for (const g of [c, totals]) {
      if (r.cogs === null) g.revenueWithoutCost += r.revenue;
      else {
        g.revenue += r.revenue;
        g.cogs += r.cogs;
      }
    }
  }
  const finish = (g: GroupProfit) => {
    g.revenue = roundRM(g.revenue);
    g.cogs = roundRM(g.cogs);
    g.grossProfit = roundRM(g.revenue - g.cogs);
    g.marginPct = pct(g.grossProfit, g.revenue);
    g.revenueWithoutCost = roundRM(g.revenueWithoutCost);
  };
  finish(totals);
  const categories = [...cats.values()];
  categories.forEach(finish);
  categories.sort((x, y) => y.grossProfit - x.grossProfit || x.category.localeCompare(y.category));

  // Outlet revenue/cogs/margin use products with a known cost (same basis as the totals);
  // average receipt uses all sales.
  const outlets: OutletProfit[] = [...outletAcc.entries()].map(([outlet, o]) => {
    const revenue = roundRM(o.revenue - o.noCost);
    const cogs = roundRM(o.cogs);
    return {
      outlet,
      revenue,
      cogs,
      grossProfit: roundRM(revenue - cogs),
      marginPct: pct(revenue - cogs, revenue),
      revenueWithoutCost: roundRM(o.noCost),
      receipts: o.receipts.size,
      units: o.units,
      avgReceipt: o.receipts.size ? roundRM(o.revenue / o.receipts.size) : null,
    };
  });
  outlets.sort((a, b) => b.revenue - a.revenue || a.outlet.localeCompare(b.outlet));

  // Findings
  const findings: Finding[] = [];
  const target = t.targetMarginPct;
  for (const r of result) {
    // Below cost needs units sold and a cost, not revenue: free or 100%-discounted sales of a costed
    // product (revenue RM0) are below cost too. The margin % check (PRF-03) needs revenue above zero.
    if (r.cogs === null || r.grossProfit === null || r.units <= 0 || r.cogs <= 0) continue;
    const evidence = [
      { file: 'sales' as const, rows: r.saleRows },
      { file: 'products' as const, rows: r.productRows },
    ];
    if (r.grossProfit < -0.005) {
      findings.push({
        id: findingId('PRF-02', skuKey(r.sku)),
        ruleId: 'PRF-02',
        severity: RULES_BY_ID['PRF-02'].severity as Finding['severity'],
        subject: r.name,
        params: { sku: r.sku, name: r.name, avgPrice: r.avgPrice ?? 0, unitCost: r.unitCost ?? 0, units: r.units, revenue: r.revenue, cogs: r.cogs },
        amount: roundRM(-r.grossProfit),
        amountKind: 'belowCost',
        evidence,
      });
    } else if (r.revenue > 0 && r.marginPct !== null && r.marginPct < target) {
      findings.push({
        id: findingId('PRF-03', skuKey(r.sku)),
        ruleId: 'PRF-03',
        severity: RULES_BY_ID['PRF-03'].severity as Finding['severity'],
        subject: r.name,
        params: { sku: r.sku, name: r.name, margin: r.marginPct, target, revenue: r.revenue, grossProfit: r.grossProfit },
        amount: roundRM((target / 100) * r.revenue - r.grossProfit),
        amountKind: 'marginGap',
        evidence,
      });
    }
  }
  return { products: result, categories, outlets, totals, unknownSkus, findings };
}
