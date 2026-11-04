/**
 * Synthetic 12-month dataset for a fictional two-outlet Penang minimart, with
 * known ("planted") issues so the analyses can be checked against an answer key.
 *
 * Fully deterministic: same seed → byte-identical files. No real businesses,
 * people or personal data. Patterns: weekday/weekend, year-end, Chinese New Year
 * (17 Feb 2026), Ramadan and Hari Raya Aidilfitri (~20 Mar 2026), slight growth.
 */
import { addDays, dayNumber, daysBetween, fromDayNumber, weekdayMon0 } from '../core/dates';
import { roundRM } from '../core/numbers';
import type { FileKind } from '../core/types';
import { TEMPLATE_HEADERS } from '../core/templates';
import { FIELDS } from '../core/fields';
import type { FixedCost } from '../rules/settings';
import { BASE_ITEMS, OUTLETS, SHOP_NAME, SUPPLIERS, type MarginBand, type Season } from './catalog';
import { Rng } from './rng';

export const DEMO_START = '2025-11-03'; // Monday
export const DEMO_END = '2026-11-01'; // Sunday — 52 full weeks
export const DEMO_SEED = 20261101;

type Role = 'regular' | 'belowCost' | 'jump' | 'dead' | 'neverSold' | 'slow' | 'festive';

interface Product {
  sku: string;
  name: string;
  category: string;
  supplier: number;
  band: MarginBand;
  pop: number;
  season?: Season;
  role: Role;
  /** Planted margin used to set the shelf price. */
  margin: number;
  cost0: number;
  costEvents: { date: string; factor: number }[];
  price: number;
  /** Sells only on or before this date. */
  stopDate?: string;
  /** Planted leftover / on-hand quantity (else computed). */
  plannedOnHand?: number;
  lastReceivedOverride?: string;
  jumpPct?: number;
}

export interface Planted {
  duplicateSameNumber: { supplier: string; invoiceNo: string; how: string }[];
  duplicateSameAmount: { supplier: string; invoiceNos: [string, string]; total: number; bothPaid: boolean }[];
  belowCost: { sku: string; name: string; reason: string }[];
  deadStock: { sku: string; name: string; reason: string }[];
  slowNotDead: { sku: string; name: string }[];
  priceJumps: { supplier: string; sku: string; name: string; pct: number; date: string }[];
  overpaid: { supplier: string; invoiceNo: string; kind: 'paidTwice' | 'overpaid'; invoiceTotal: number; paid: number }[];
  unmatchedPayments: { supplier: string; reference: string; amount: number; date: string }[];
  lowMarginByDesign: string[];
  cashCrunchWeekStart: string;
}

export interface DemoData {
  shopName: string;
  start: string;
  end: string;
  tables: Record<FileKind, string[][]>;
  planted: Planted;
  cashflow: { openingBalance: number; fixedCosts: FixedCost[] };
}

const CATEGORY_CODES: Record<string, string> = {
  'Rice & Grains': 'RG', 'Sugar, Flour & Oil': 'SF', 'Spices & Paste': 'SP', 'Sauces & Condiments': 'SC',
  'Canned Food': 'CF', 'Noodles & Pasta': 'NP', 'Coffee & Tea': 'CT', Drinks: 'DR', 'Dairy & Eggs': 'DE',
  'Snacks & Biscuits': 'SB', 'Frozen & Chilled': 'FZ', Bread: 'BR', 'Dried Seafood': 'DS', Household: 'HH',
  'Personal Care': 'PC', Health: 'HL', Baby: 'BB', Pet: 'PT', Stationery: 'ST', Festive: 'FS',
};

const SEASON_WINDOWS: Record<Season, [string, string]> = {
  yearend2025: ['2025-11-15', '2025-12-31'],
  cny: ['2026-01-20', '2026-02-24'],
  raya: ['2026-02-20', '2026-03-28'],
  yearend2026: ['2026-10-15', DEMO_END],
};
const SEASON_ORDER_DATE: Record<Season, string> = {
  yearend2025: '2025-11-10',
  cny: '2026-01-12',
  raya: '2026-02-12',
  yearend2026: '2026-10-19',
};

const fmtDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const money = (n: number) => roundRM(n).toFixed(2);

function priceFor(cost: number, margin: number): number {
  return Math.ceil((cost / (1 - margin)) * 10 - 1e-9) / 10;
}

function costAt(p: Product, date: string): number {
  let c = p.cost0;
  for (const e of p.costEvents) if (e.date <= date) c *= e.factor;
  return roundRM(c);
}

function trafficFactor(date: string): number {
  const md = date.slice(5);
  let f = 1;
  if (date >= '2025-12-12' && date <= '2025-12-31') f = 1.25;
  if (date >= '2026-02-03' && date <= '2026-02-16') f = 1.45;
  if (date >= '2026-02-17' && date <= '2026-02-19') f = 0.6;
  if (date >= '2026-03-10' && date <= '2026-03-19') f = 1.3;
  if (date >= '2026-03-20' && date <= '2026-03-22') f = 0.7;
  if (md >= '08-29' && md <= '08-31') f = 1.1;
  // Gentle growth over the year (~8%).
  const growth = 0.97 + 0.08 * (daysBetween(DEMO_START, date) / 364);
  return f * growth;
}

const WEEKDAY = [0.88, 0.85, 0.9, 0.95, 1.12, 1.3, 1.2];
const OUTLET_RECEIPTS = [70, 52];

export function generateDemo(seed: number = DEMO_SEED): DemoData {
  const rng = new Rng(seed);

  // ---------- 1. Products ----------
  const products: Product[] = [];
  const counters: Record<string, number> = {};
  for (const base of BASE_ITEMS) {
    for (const [suffix, factor] of base.variants) {
      const code = CATEGORY_CODES[base.category] ?? 'GN';
      counters[code] = (counters[code] ?? 0) + 1;
      const margin =
        base.band === 'staple' ? rng.range(0.07, 0.17) : base.band === 'normal' ? rng.range(0.29, 0.4) : rng.range(0.4, 0.55);
      const cost0 = roundRM(base.cost * factor * rng.range(0.97, 1.03));
      products.push({
        sku: `${code}-${String(counters[code]).padStart(3, '0')}`,
        name: `${base.name} ${suffix}`,
        category: base.category,
        supplier: base.supplier,
        band: base.band,
        pop: Math.max(1, base.pop - (factor > 1.5 ? 1 : 0)),
        season: base.season,
        role: base.season ? 'festive' : 'regular',
        margin,
        cost0,
        costEvents: [],
        price: 0,
      });
    }
  }

  const regular = () => products.filter((p) => p.role === 'regular');
  const take = (pool: Product[], n: number, filter: (p: Product) => boolean): Product[] =>
    rng.shuffle(pool.filter(filter)).slice(0, n);

  // Price jumps (4): two of them were priced on the old cost, so they end up below cost.
  const jumpPlan = [
    { pct: 22, date: '2026-03-16', priced: 'old' },
    { pct: 15, date: '2026-05-11', priced: 'old' },
    { pct: 12, date: '2026-06-22', priced: 'new' },
    { pct: 8, date: '2026-08-04', priced: 'new' },
  ] as const;
  const usedSuppliersForJumps = new Set<number>();
  const jumpProducts: Product[] = [];
  for (const plan of jumpPlan) {
    const [p] = take(regular(), 1, (x) => x.band === 'normal' && x.cost0 >= 3 && x.pop >= 5 && !usedSuppliersForJumps.has(x.supplier));
    if (!p) throw new Error('demo: no jump candidate');
    usedSuppliersForJumps.add(p.supplier);
    p.role = 'jump';
    p.jumpPct = plan.pct;
    p.costEvents.push({ date: plan.date, factor: 1 + plan.pct / 100 });
    if (plan.priced === 'old') p.margin = 0.07; // shelf price never updated after the cost rise
    jumpProducts.push(p);
  }
  // Below cost (8 more, total 10 with the two jump products above).
  const belowCostOnly = take(regular(), 8, (x) => x.band === 'normal' && x.cost0 >= 3 && x.pop >= 4);
  for (const p of belowCostOnly) p.role = 'belowCost';
  // Dead stock: 13 regular lines that stopped selling, 5 never sold, 7 festive leftovers.
  const stopSellers = take(regular(), 13, (x) => x.pop <= 4);
  for (const p of stopSellers) {
    p.role = 'dead';
    p.stopDate = addDays(DEMO_START, rng.int(40, 364 - 100));
    p.plannedOnHand = rng.int(8, 60);
  }
  const neverSold = take(regular(), 5, (x) => x.pop <= 3);
  for (const p of neverSold) {
    p.role = 'neverSold';
    p.plannedOnHand = rng.int(6, 40);
    p.lastReceivedOverride = addDays(DEMO_START, -rng.int(20, 80));
  }
  const festiveLeftovers = [
    ...take(products, 3, (x) => x.season === 'cny' && x.role === 'festive'),
    ...take(products, 2, (x) => x.season === 'raya' && x.role === 'festive'),
    ...take(products, 2, (x) => x.season === 'yearend2025' && x.role === 'festive'),
  ];
  for (const p of festiveLeftovers) {
    p.role = 'dead';
    p.plannedOnHand = rng.int(6, 30);
  }
  // Slow but not dead (last sale 65–85 days before the end).
  const slow = take(regular(), 6, (x) => x.pop <= 4);
  for (const p of slow) {
    p.role = 'slow';
    p.stopDate = addDays(DEMO_END, -rng.int(65, 85));
    p.plannedOnHand = rng.int(5, 25);
  }
  // Small, harmless cost drift on some regular lines (always under 3%, below the 5% rule).
  for (const p of products) {
    if ((p.role === 'regular' || p.role === 'slow') && rng.chance(0.4)) {
      p.costEvents.push({ date: addDays(DEMO_START, rng.int(30, 330)), factor: rng.range(0.98, 1.03) });
    }
  }
  for (const p of products) {
    const finalCost = costAt(p, DEMO_END);
    if (p.role === 'belowCost') {
      p.price = Math.ceil(finalCost * rng.range(0.86, 0.94) * 10) / 10;
      if (p.price >= finalCost) p.price = Math.floor(finalCost * 0.9 * 10) / 10;
    } else if (p.role === 'jump' && p.margin === 0.07) {
      p.price = priceFor(p.cost0, 0.07);
    } else {
      p.price = priceFor(finalCost, p.margin);
    }
  }

  // ---------- 2. Sales ----------
  const sales: string[][] = [];
  const soldBySku = new Map<string, Map<string, number>>(); // sku → date → units
  const lastSale = new Map<string, string>();
  const receiptSeq = [100000, 200000];
  const refunds: { date: string; outlet: number; p: Product }[] = [];
  const addUnits = (sku: string, date: string, qty: number) => {
    let m = soldBySku.get(sku);
    if (!m) soldBySku.set(sku, (m = new Map()));
    m.set(date, (m.get(date) ?? 0) + qty);
  };
  const pushLine = (date: string, outlet: number, receipt: string, p: Product, qty: number, discounted: boolean) => {
    const gross = qty * p.price;
    const discount = discounted ? roundRM(gross * 0.1) : 0;
    sales.push([fmtDate(date), receipt, p.sku, p.name, p.category, String(qty), money(p.price), money(discount), money(gross - Math.sign(qty) * discount), OUTLETS[outlet]!]);
    if (qty > 0) {
      addUnits(p.sku, date, qty);
      if (!lastSale.has(p.sku) || lastSale.get(p.sku)! < date) lastSale.set(p.sku, date);
    } else addUnits(p.sku, date, qty);
  };

  const dayCount = daysBetween(DEMO_START, DEMO_END) + 1;
  for (let i = 0; i < dayCount; i++) {
    const date = addDays(DEMO_START, i);
    // Weighted product list for the day.
    const weights: number[] = [];
    let total = 0;
    for (const p of products) {
      let w = 0;
      const inWindow = (s: Season) => date >= SEASON_WINDOWS[s][0] && date <= SEASON_WINDOWS[s][1];
      if (p.season) {
        if (inWindow(p.season)) w = p.pop * 3.2;
      } else if (p.role === 'neverSold') w = 0;
      else if (p.stopDate && date > p.stopDate) w = 0;
      else w = Math.pow(p.pop, 1.35);
      total += w;
      weights.push(total);
    }
    const pick = (): Product => {
      const r = rng.next() * total;
      let lo = 0;
      let hi = weights.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (weights[mid]! > r) hi = mid;
        else lo = mid + 1;
      }
      return products[lo]!;
    };
    for (let o = 0; o < OUTLETS.length; o++) {
      const n = Math.max(5, Math.round(OUTLET_RECEIPTS[o]! * WEEKDAY[weekdayMon0(date)]! * trafficFactor(date) * (1 + 0.08 * rng.normal())));
      for (let k = 0; k < n; k++) {
        const receipt = `${o === 0 ? 'JL' : 'BL'}-${++receiptSeq[o]!}`;
        const r = rng.next();
        const lines = r < 0.5 ? 1 : r < 0.8 ? 2 : r < 0.95 ? 3 : 4;
        for (let l = 0; l < lines; l++) {
          const p = pick();
          const q = rng.next();
          const qty = p.band === 'staple' ? (q < 0.85 ? 1 : 2) : q < 0.68 ? 1 : q < 0.92 ? 2 : 3;
          const discounted = p.band !== 'staple' && p.role !== 'belowCost' && p.role !== 'jump' && rng.chance(0.03);
          pushLine(date, o, receipt, p, qty, discounted);
          if (rng.chance(0.0025) && !p.stopDate && !p.season) refunds.push({ date: addDays(date, rng.int(1, 3)), outlet: o, p });
        }
      }
    }
  }
  // Every regular line must have sold recently (keeps the dead-stock answer key exact).
  for (const p of products) {
    if (p.role !== 'regular' && p.role !== 'belowCost' && p.role !== 'jump') continue;
    const last = lastSale.get(p.sku);
    if (!last || daysBetween(last, DEMO_END) > 40) {
      const d = addDays(DEMO_END, -rng.int(1, 14));
      const o = rng.int(0, 1);
      pushLine(d, o, `${o === 0 ? 'JL' : 'BL'}-${++receiptSeq[o]!}`, p, 1, false);
    }
  }
  for (const rf of refunds) {
    if (rf.date > DEMO_END) continue;
    pushLine(rf.date, rf.outlet, `RF-${++receiptSeq[rf.outlet]!}`, rf.p, -1, false);
  }
  // Sort by date (stable on receipt) — exports are usually date-ordered.
  const iso = (row: string[]) => `${row[0]!.slice(6, 10)}-${row[0]!.slice(3, 5)}-${row[0]!.slice(0, 2)}`;
  sales.sort((a, b) => (iso(a) < iso(b) ? -1 : iso(a) > iso(b) ? 1 : a[1]! < b[1]! ? -1 : a[1]! > b[1]! ? 1 : 0));

  // ---------- 3. Supplier invoices ----------
  interface Line { sku: string; description: string; qty: number; unitPrice: number }
  interface Inv { supplier: number; invoiceNo: string; date: string; due: string; lines: Line[]; tag?: string }
  const invoices: Inv[] = [];
  const seq = SUPPLIERS.map((s, i) => (s.style === 3 ? 400000 + i * 7919 : 100 + i * 37));
  const nextInvoiceNo = (s: number, date: string): string => {
    seq[s]! += rng.int(1, 9);
    const sup = SUPPLIERS[s]!;
    const n = seq[s]!;
    const yy = date.slice(2, 4);
    switch (sup.style) {
      case 0: return `${sup.prefix}-${String(n).padStart(5, '0')}`;
      case 1: return `INV${yy}${date.slice(5, 7)}-${String(n).padStart(4, '0')}`;
      case 2: return `${sup.prefix}/${yy}/${String(n).padStart(4, '0')}`;
      default: return String(n);
    }
  };
  const unitsSold = (sku: string, from: string, to: string): number => {
    const m = soldBySku.get(sku);
    if (!m) return 0;
    let s = 0;
    for (const [d, q] of m) if (d >= from && d <= to) s += q;
    return s;
  };
  const lastReceived = new Map<string, string>();
  const onHand = new Map<string, number>();
  const PERISHABLE = new Set(['Mikuning', 'Susumurni', 'Bekuria', 'Rotimas', 'Telurmas', 'Kristalis'].map((n) => SUPPLIERS.findIndex((s) => s.name.startsWith(n))));
  const KUIHRAYA = SUPPLIERS.findIndex((s) => s.name.startsWith('Kuihraya')); // this supplier's invoices have no SKU codes

  for (let s = 0; s < SUPPLIERS.length; s++) {
    const items = products.filter((p) => p.supplier === s && !p.season && p.role !== 'neverSold');
    if (!items.length) continue;
    const interval = PERISHABLE.has(s) ? 7 : rng.pick([14, 14, 21, 28]);
    let prev = addDays(DEMO_START, -1);
    for (let d = addDays(DEMO_START, rng.int(2, interval)); d <= addDays(DEMO_END, -2); d = addDays(d, interval + rng.int(-1, 1))) {
      const lines: Line[] = [];
      for (const p of items) {
        if (p.stopDate && d > addDays(p.stopDate, -5)) continue;
        const sold = unitsSold(p.sku, addDays(prev, 1), d) + (prev < DEMO_START ? Math.ceil(unitsSold(p.sku, DEMO_START, addDays(DEMO_START, 13)) / 2) : 0);
        if (sold <= 0) continue;
        const pack = p.price < 3 ? 12 : 6;
        const qty = Math.ceil(sold / pack) * pack;
        lines.push({ sku: s === KUIHRAYA ? '' : p.sku, description: p.name, qty, unitPrice: costAt(p, d) });
        lastReceived.set(p.sku, d);
      }
      if (lines.length) invoices.push({ supplier: s, invoiceNo: nextInvoiceNo(s, d), date: d, due: addDays(d, SUPPLIERS[s]!.terms), lines });
      prev = d;
    }
  }
  // Festive one-off orders.
  for (const season of Object.keys(SEASON_ORDER_DATE) as Season[]) {
    const items = products.filter((p) => p.season === season);
    const bySupplier = new Map<number, Product[]>();
    for (const p of items) bySupplier.set(p.supplier, [...(bySupplier.get(p.supplier) ?? []), p]);
    for (const [s, ps] of bySupplier) {
      const date = addDays(SEASON_ORDER_DATE[season], s % 3);
      const lines: Line[] = [];
      for (const p of ps) {
        const sold = unitsSold(p.sku, SEASON_WINDOWS[season][0], DEMO_END);
        const left = season === 'yearend2026' ? rng.int(140, 220) : (p.plannedOnHand ?? 0);
        if (season === 'yearend2026') p.plannedOnHand = left;
        lines.push({ sku: s === KUIHRAYA ? '' : p.sku, description: p.name, qty: sold + left, unitPrice: costAt(p, date) });
        lastReceived.set(p.sku, date);
      }
      invoices.push({ supplier: s, invoiceNo: nextInvoiceNo(s, date), date, due: addDays(date, SUPPLIERS[s]!.terms), lines });
    }
  }
  const invTotal = (inv: Inv) => roundRM(inv.lines.reduce((a, l) => a + roundRM(l.qty * l.unitPrice), 0));
  invoices.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.supplier - b.supplier));
  // Remove accidental "same supplier, same amount within 7 days" pairs (only planted ones may exist).
  for (let i = 0; i < invoices.length; i++) {
    for (let j = i + 1; j < invoices.length; j++) {
      const a = invoices[i]!;
      const b = invoices[j]!;
      if (daysBetween(a.date, b.date) > 10) break;
      if (a.supplier === b.supplier && Math.abs(invTotal(a) - invTotal(b)) < 0.005) b.lines[0]!.qty += 1;
    }
  }

  // Planted duplicates.
  const candidates = (from: string, to: string, exclude: Set<number>) =>
    invoices.filter((v) => !v.tag && v.date >= from && v.date <= to && !exclude.has(v.supplier) && !jumpProducts.some((j) => j.supplier === v.supplier) && v.lines.length >= 2 && !products.find((p) => p.sku === v.lines[0]!.sku)?.season);
  const usedDupSuppliers = new Set<number>([KUIHRAYA]);
  const choose = (from: string, to: string): Inv => {
    const pool = candidates(from, to, usedDupSuppliers);
    const v = rng.pick(pool);
    usedDupSuppliers.add(v.supplier);
    return v;
  };
  const planted: Planted = {
    duplicateSameNumber: [], duplicateSameAmount: [], belowCost: [], deadStock: [], slowNotDead: [], priceJumps: [],
    overpaid: [], unmatchedPayments: [], lowMarginByDesign: [], cashCrunchWeekStart: '2026-11-16',
  };
  const copies: Inv[] = [];
  {
    const d1 = choose('2026-01-05', '2026-04-30');
    copies.push({ ...d1, date: addDays(d1.date, 3), due: addDays(d1.due, 3), lines: d1.lines.map((l) => ({ ...l })), tag: 'copy-sameNo' });
    d1.tag = 'orig';
    planted.duplicateSameNumber.push({ supplier: SUPPLIERS[d1.supplier]!.name, invoiceNo: d1.invoiceNo, how: 'Same invoice keyed in again 3 days later' });
    const d2 = choose('2026-05-01', '2026-07-31');
    copies.push({ ...d2, lines: d2.lines.map((l) => ({ ...l })), tag: 'copy-sameNo-sameDate' });
    d2.tag = 'orig';
    planted.duplicateSameNumber.push({ supplier: SUPPLIERS[d2.supplier]!.name, invoiceNo: d2.invoiceNo, how: 'All lines entered twice on the same date' });
    const d3 = choose('2026-07-01', '2026-08-31');
    copies.push({ ...d3, date: addDays(d3.date, 12), due: addDays(d3.due, 12), lines: d3.lines.map((l) => ({ ...l })), tag: 'copy-sameNo' });
    d3.tag = 'orig';
    planted.duplicateSameNumber.push({ supplier: SUPPLIERS[d3.supplier]!.name, invoiceNo: d3.invoiceNo, how: 'Supplier copy of the same invoice keyed in 12 days later' });
    const sameAmount = [
      { range: ['2026-03-01', '2026-06-30'] as const, gap: 2, bothPaid: true, renumber: (n: string) => n.replace(/^[A-Z]+[-/]?/, '').replace(/^\d{2}\//, '') || `${n}-R` },
      { range: ['2026-10-01', '2026-10-12'] as const, gap: 4, bothPaid: false, renumber: (n: string) => `${n}A` },
      { range: ['2026-10-05', '2026-10-20'] as const, gap: 5, bothPaid: false, renumber: (_n: string) => '' },
    ];
    for (const plan of sameAmount) {
      const v = choose(plan.range[0], plan.range[1]);
      v.tag = 'orig';
      const renumbered = plan.renumber(v.invoiceNo);
      const no = renumbered && renumbered !== v.invoiceNo ? renumbered : nextInvoiceNo(v.supplier, addDays(v.date, plan.gap));
      copies.push({ ...v, invoiceNo: no, date: addDays(v.date, plan.gap), due: addDays(v.due, plan.gap), lines: v.lines.map((l) => ({ ...l })), tag: plan.bothPaid ? 'copy-amount-paid' : 'copy-amount' });
      planted.duplicateSameAmount.push({ supplier: SUPPLIERS[v.supplier]!.name, invoiceNos: [v.invoiceNo, no], total: invTotal(v), bothPaid: plan.bothPaid });
    }
  }
  const allInvoices = [...invoices, ...copies].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.supplier - b.supplier || (a.invoiceNo < b.invoiceNo ? -1 : 1)));

  // ---------- 4. Payments ----------
  interface Pay { date: string; supplier: number; amount: number; reference: string }
  const payments: Pay[] = [];
  const totalsBySupplier = new Map<number, number[]>();
  for (const v of allInvoices) totalsBySupplier.set(v.supplier, [...(totalsBySupplier.get(v.supplier) ?? []), invTotal(v)]);
  const unique = (s: number, amt: number) => (totalsBySupplier.get(s) ?? []).filter((t) => Math.abs(t - amt) < 0.005).length === 1;
  const payable = allInvoices.filter((v) => v.tag !== 'copy-sameNo' && v.tag !== 'copy-sameNo-sameDate' && v.tag !== 'copy-amount');
  let overpaidPicked = 0;
  for (const v of payable) {
    if (v.due > DEMO_END) continue;
    const total = invTotal(v);
    let date = addDays(v.due, -rng.int(0, 6));
    if (date <= v.date) date = addDays(v.date, 1);
    const r = rng.next();
    const reference = r < 0.8 || !unique(v.supplier, total) ? v.invoiceNo : r < 0.88 ? `Bayaran ${v.invoiceNo}` : '';
    let amount = total;
    // Planted overpayments, mid-year, ordinary invoices.
    if (!v.tag && v.date >= '2026-04-01' && v.date <= '2026-08-31' && total > 800 && reference === v.invoiceNo) {
      if (overpaidPicked === 0) {
        payments.push({ date, supplier: v.supplier, amount, reference });
        const second = addDays(date, 9);
        payments.push({ date: second, supplier: v.supplier, amount, reference });
        planted.overpaid.push({ supplier: SUPPLIERS[v.supplier]!.name, invoiceNo: v.invoiceNo, kind: 'paidTwice', invoiceTotal: total, paid: roundRM(total * 2) });
        overpaidPicked++;
        v.tag = 'overpaid';
        continue;
      }
      if (overpaidPicked === 1 && v.supplier !== SUPPLIERS.findIndex((s) => s.name === planted.overpaid[0]!.supplier)) {
        const digits = money(total).replace('.', '').split('');
        let k = digits.findIndex((c, idx) => idx < digits.length - 1 && c < digits[idx + 1]!);
        if (k < 0) k = 0;
        [digits[k], digits[k + 1]] = [digits[k + 1]!, digits[k]!];
        const swapped = Number(`${digits.slice(0, -2).join('')}.${digits.slice(-2).join('')}`);
        if (swapped > total + 1) {
          amount = swapped;
          planted.overpaid.push({ supplier: SUPPLIERS[v.supplier]!.name, invoiceNo: v.invoiceNo, kind: 'overpaid', invoiceTotal: total, paid: amount });
          overpaidPicked++;
          v.tag = 'overpaid';
        }
      }
    }
    payments.push({ date, supplier: v.supplier, amount, reference });
  }
  const hamperia = SUPPLIERS.findIndex((s) => s.name.startsWith('Hamperia'));
  const bilisora = SUPPLIERS.findIndex((s) => s.name.startsWith('Bilisora'));
  const u1 = { date: '2026-09-28', supplier: hamperia, amount: 2000, reference: 'DEPOSIT HAMPER ORDER' };
  const u2 = { date: '2026-07-14', supplier: bilisora, amount: 1286.4, reference: `${SUPPLIERS[bilisora]!.prefix}-99871` };
  for (const u of [u1, u2]) {
    if (!unique(u.supplier, u.amount) && (totalsBySupplier.get(u.supplier) ?? []).some((t) => Math.abs(t - u.amount) < 0.005)) u.amount += 13.5;
    payments.push(u);
    planted.unmatchedPayments.push({ supplier: SUPPLIERS[u.supplier]!.name, reference: u.reference, amount: u.amount, date: u.date });
  }
  payments.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.supplier - b.supplier));

  // ---------- 5. Stock list ----------
  const productRows: string[][] = [];
  for (const p of products) {
    let qty: number;
    if (p.plannedOnHand !== undefined) qty = p.plannedOnHand;
    else if (p.season) qty = 0;
    else {
      const recent = unitsSold(p.sku, addDays(DEMO_END, -27), DEMO_END);
      qty = Math.max(2, Math.round(recent * rng.range(0.35, 1.8)));
    }
    if (p.season === 'yearend2026') qty = (p.plannedOnHand ?? 0);
    onHand.set(p.sku, qty);
    const lr = p.lastReceivedOverride ?? lastReceived.get(p.sku) ?? '';
    productRows.push([p.sku, p.name, p.category, money(costAt(p, DEMO_END)), String(qty), lr ? fmtDate(lr) : '']);
  }

  // ---------- 6. Answer key ----------
  for (const p of products) {
    if (p.role === 'belowCost') planted.belowCost.push({ sku: p.sku, name: p.name, reason: 'Shelf price set below unit cost' });
    if (p.role === 'jump' && p.margin === 0.07) planted.belowCost.push({ sku: p.sku, name: p.name, reason: `Supplier cost rose ${p.jumpPct}% but the shelf price was not updated` });
    if (p.role === 'dead' || p.role === 'neverSold') {
      planted.deadStock.push({
        sku: p.sku,
        name: p.name,
        reason: p.role === 'neverSold' ? 'No sale in the whole period' : p.season ? 'Festive leftover after the season' : 'Stopped selling',
      });
    }
    if (p.role === 'slow') planted.slowNotDead.push({ sku: p.sku, name: p.name });
    if (p.role === 'jump') {
      const ev = p.costEvents[0]!;
      planted.priceJumps.push({ supplier: SUPPLIERS[p.supplier]!.name, sku: p.sku, name: p.name, pct: p.jumpPct!, date: ev.date });
    }
    if (p.band === 'staple' && p.role !== 'neverSold' && p.role !== 'dead' && p.role !== 'belowCost') planted.lowMarginByDesign.push(p.sku);
  }

  const tables: Record<FileKind, string[][]> = {
    sales: [header('sales'), ...sales],
    products: [header('products'), ...productRows],
    invoices: [
      header('invoices'),
      ...allInvoices.flatMap((v) =>
        v.lines.map((l) => [SUPPLIERS[v.supplier]!.name, v.invoiceNo, fmtDate(v.date), l.sku, l.description, String(l.qty), money(l.unitPrice), money(l.qty * l.unitPrice), fmtDate(v.due)]),
      ),
    ],
    payments: [header('payments'), ...payments.map((p) => [fmtDate(p.date), SUPPLIERS[p.supplier]!.name, money(p.amount), p.reference])],
  };

  return {
    shopName: SHOP_NAME,
    start: DEMO_START,
    end: DEMO_END,
    tables,
    planted,
    cashflow: {
      // Chosen so that exactly one forecast week (16–22 Nov 2026) dips below zero:
      // the planted year-end hamper and snack orders (dated 20 Oct, 30-day terms) fall due on 19 Nov.
      openingBalance: 20000,
      fixedCosts: [
        { id: 'rent', label: 'Rent (2 outlets)', amount: 7800, dayOfMonth: 1 },
        { id: 'salaries', label: 'Salaries, EPF & SOCSO', amount: 9600, dayOfMonth: 7 },
        { id: 'utilities', label: 'Utilities & internet', amount: 1900, dayOfMonth: 15 },
      ],
    },
  };
}

function header(kind: FileKind): string[] {
  return FIELDS[kind].map((f) => TEMPLATE_HEADERS[kind][f.key] ?? f.key);
}

export { dayNumber, fromDayNumber };
