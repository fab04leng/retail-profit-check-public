import { addDays, daysBetween } from '../core/dates';
import { roundRM } from '../core/numbers';
import type { ProductRow, SaleRow } from '../core/types';
import { AGE_BUCKETS, RULES_BY_ID, type AgeBucketKey } from '../rules/rules.config';
import type { Thresholds } from '../rules/settings';
import { skuKey } from './keys';
import { findingId, type Finding } from './types';

export interface StockItem {
  sku: string;
  name: string;
  category: string;
  qtyOnHand: number;
  unitCost: number;
  /** max(qty, 0) × unit cost. */
  value: number;
  lastSale?: string;
  lastSaleRow?: number;
  ageDays: number | null;
  ageBasis: 'lastSale' | 'lastReceived' | 'periodStart' | 'unknown';
  bucket: AgeBucketKey | null;
  unitsLookback: number;
  avgDailyUnits: number;
  /** null = no sales in the look-back period. */
  coverDays: number | null;
  productRows: number[];
}

export interface StockResult {
  asOf?: string;
  items: StockItem[];
  buckets: { key: AgeBucketKey; value: number; count: number }[];
  totalValue: number;
  deadValue: number;
  deadCount: number;
  slowValue: number;
  slowCount: number;
  findings: Finding[];
}

export function bucketFor(age: number): AgeBucketKey {
  for (const b of AGE_BUCKETS) if (age <= b.max) return b.key;
  return '180+';
}

export function analyzeStock(sales: SaleRow[], products: ProductRow[], t: Thresholds): StockResult {
  let asOf: string | undefined;
  let firstDate: string | undefined;
  const last = new Map<string, { date: string; row: number }>();
  for (const s of sales) {
    if (!asOf || s.date > asOf) asOf = s.date;
    if (!firstDate || s.date < firstDate) firstDate = s.date;
    if (s.qty <= 0) continue; // refunds are not sales
    const k = skuKey(s.sku);
    const cur = last.get(k);
    if (!cur || s.date > cur.date || (s.date === cur.date && s.row > cur.row)) last.set(k, { date: s.date, row: s.row });
  }
  const lookbackStart = asOf ? addDays(asOf, -t.coverLookbackDays + 1) : undefined;
  const lookUnits = new Map<string, number>();
  if (lookbackStart) {
    for (const s of sales) {
      if (s.date < lookbackStart) continue;
      const k = skuKey(s.sku);
      lookUnits.set(k, (lookUnits.get(k) ?? 0) + s.qty);
    }
  }

  const items: StockItem[] = [];
  const buckets = AGE_BUCKETS.map((b) => ({ key: b.key, value: 0, count: 0 }));
  const findings: Finding[] = [];
  let totalValue = 0;
  let deadValue = 0;
  let deadCount = 0;
  let slowValue = 0;
  let slowCount = 0;

  for (const p of products) {
    const k = skuKey(p.sku);
    const qty = Math.max(0, p.qtyOnHand);
    const value = roundRM(qty * p.unitCost);
    const ls = last.get(k);
    let ageDays: number | null = null;
    let ageBasis: StockItem['ageBasis'] = 'unknown';
    if (asOf) {
      if (ls) {
        ageDays = daysBetween(ls.date, asOf);
        ageBasis = 'lastSale';
      } else if (p.lastReceived) {
        ageDays = Math.max(0, daysBetween(p.lastReceived, asOf));
        ageBasis = 'lastReceived';
      } else if (firstDate) {
        ageDays = daysBetween(firstDate, asOf);
        ageBasis = 'periodStart';
      }
    }
    const units = lookUnits.get(k) ?? 0;
    const avgDaily = units > 0 ? units / t.coverLookbackDays : 0;
    const item: StockItem = {
      sku: p.sku,
      name: p.name,
      category: p.category,
      qtyOnHand: p.qtyOnHand,
      unitCost: p.unitCost,
      value,
      lastSale: ls?.date,
      lastSaleRow: ls?.row,
      ageDays,
      ageBasis,
      bucket: ageDays === null ? null : bucketFor(ageDays),
      unitsLookback: units,
      avgDailyUnits: avgDaily,
      coverDays: avgDaily > 0 ? Math.round(qty / avgDaily) : null,
      productRows: p.rows,
    };
    items.push(item);
    totalValue += value;
    if (item.bucket && qty > 0) {
      const b = buckets.find((x) => x.key === item.bucket)!;
      b.value += value;
      b.count++;
    }
    if (ageDays !== null && qty > 0 && ageDays > t.slowStockDays) {
      slowValue += value;
      slowCount++;
    }
    if (ageDays !== null && qty > 0 && ageDays > t.deadStockDays) {
      deadValue += value;
      deadCount++;
      findings.push({
        id: findingId('STK-02', k),
        ruleId: 'STK-02',
        severity: RULES_BY_ID['STK-02'].severity as Finding['severity'],
        subject: p.name,
        params: { sku: p.sku, name: p.name, days: ageDays, basis: ageBasis, lastSale: ls?.date ?? '', qty: p.qtyOnHand, unitCost: p.unitCost, threshold: t.deadStockDays },
        amount: value,
        amountKind: 'stockValue',
        evidence: [{ file: 'products', rows: p.rows }, ...(ls ? [{ file: 'sales' as const, rows: [ls.row] }] : [])],
      });
    }
  }
  for (const b of buckets) b.value = roundRM(b.value);
  items.sort((a, b) => (b.ageDays ?? -1) - (a.ageDays ?? -1) || b.value - a.value);
  findings.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
  return { asOf, items, buckets, totalValue: roundRM(totalValue), deadValue: roundRM(deadValue), deadCount, slowValue: roundRM(slowValue), slowCount, findings };
}
