import { addDays, daysBetween } from '../core/dates';
import { roundRM } from '../core/numbers';
import type { InvoiceRow, PaymentRow } from '../core/types';
import { RULES_BY_ID, type RuleId } from '../rules/rules.config';
import type { Thresholds } from '../rules/settings';
import { skuKey, textKey } from './keys';
import { findingId, type Finding } from './types';

/** "INV-0012", "inv 0012" → "INV0012". */
export function normalizeInvoiceNo(s: string): string {
  return s.toUpperCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

/** Case/punctuation-insensitive, ignores "Sdn Bhd", "Bhd", "PLT", "(M)". */
export function normalizeSupplier(s: string): string {
  return textKey(s)
    .replace(/\b(sdn\s+bhd|bhd|plt|m)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** One supplier invoice (all copies with the same supplier + invoice number grouped together). */
export interface InvoiceDoc {
  key: string;
  supplier: string;
  invoiceNo: string;
  /** Date of the first copy. */
  date: string;
  dueDate: string;
  /** Total of one copy (duplicated lines counted once). */
  total: number;
  /** All source rows, including any duplicate copies. */
  rows: number[];
  /** null when no payments file was provided. */
  paid: number | null;
  paymentRows: number[];
  /** Amount still to pay, for the cash-flow outlook. */
  outstanding: number;
}

export interface SupplierSummary {
  supplier: string;
  invoices: number;
  total: number;
  findings: number;
}

export interface SupplierResult {
  invoices: InvoiceDoc[];
  suppliers: SupplierSummary[];
  unmatchedPayments: PaymentRow[];
  findings: Finding[];
}

const sev = (id: RuleId) => RULES_BY_ID[id].severity as Finding['severity'];
const lineSig = (l: InvoiceRow) => `${skuKey(l.sku)}|${textKey(l.description)}|${l.qty}|${roundRM(l.unitPrice)}|${roundRM(l.total)}`;

interface Entry {
  date: string;
  lines: InvoiceRow[];
  total: number;
}

export function analyzeSuppliers(lines: InvoiceRow[], payments: PaymentRow[], hasPayments: boolean, t: Thresholds): SupplierResult {
  const findings: Finding[] = [];

  // ---- Group lines into invoices and copies ----
  const groups = new Map<string, InvoiceRow[]>();
  for (const l of lines) {
    const key = `${normalizeSupplier(l.supplier)}|${normalizeInvoiceNo(l.invoiceNo)}`;
    const g = groups.get(key);
    if (g) g.push(l);
    else groups.set(key, [l]);
  }
  const docs: InvoiceDoc[] = [];
  const canonicalLines: InvoiceRow[] = [];
  for (const [key, g] of groups) {
    const byDate = new Map<string, InvoiceRow[]>();
    for (const l of g) byDate.set(l.date, [...(byDate.get(l.date) ?? []), l]);
    const entries: Entry[] = [...byDate.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, ls]) => ({ date, lines: ls, total: roundRM(ls.reduce((a, l) => a + l.total, 0)) }));
    const first = entries[0]!;
    // Same date, every line repeated k times → keyed in k times.
    let repeat = 1;
    if (first.lines.length >= 2) {
      const counts = new Map<string, number>();
      for (const l of first.lines) counts.set(lineSig(l), (counts.get(lineSig(l)) ?? 0) + 1);
      const c = [...counts.values()];
      const min = Math.min(...c);
      if (min >= 2 && c.every((x) => x === min)) repeat = min;
    }
    const total = roundRM(first.total / repeat);
    const seen = new Set<string>();
    for (const l of first.lines) {
      const sig = lineSig(l);
      if (repeat > 1 && seen.has(sig)) continue;
      seen.add(sig);
      canonicalLines.push(l);
    }
    const dueDates = first.lines.map((l) => l.dueDate).filter((d): d is string => !!d).sort();
    const doc: InvoiceDoc = {
      key,
      supplier: first.lines[0]!.supplier,
      invoiceNo: first.lines[0]!.invoiceNo,
      date: first.date,
      dueDate: dueDates[dueDates.length - 1] ?? addDays(first.date, t.defaultTermsDays),
      total,
      rows: g.map((l) => l.row).sort((a, b) => a - b),
      paid: hasPayments ? 0 : null,
      paymentRows: [],
      outstanding: total,
    };
    docs.push(doc);
    const copies = entries.length > 1 ? entries.length : repeat;
    if (copies > 1) {
      const extra = entries.length > 1 ? roundRM(entries.slice(1).reduce((a, e) => a + e.total, 0)) : roundRM(total * (repeat - 1));
      findings.push({
        id: findingId('SUP-01', key),
        ruleId: 'SUP-01',
        severity: sev('SUP-01'),
        subject: `${doc.supplier} · ${doc.invoiceNo}`,
        params: { supplier: doc.supplier, invoiceNo: doc.invoiceNo, copies, dates: entries.map((e) => e.date).join(', '), sameDate: entries.length === 1 ? 1 : 0 },
        amount: extra,
        amountKind: 'invoiceTotal',
        evidence: [{ file: 'invoices', rows: doc.rows }],
      });
    }
  }
  docs.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.supplier.localeCompare(b.supplier) || a.invoiceNo.localeCompare(b.invoiceNo)));

  // ---- SUP-02: same supplier, same total, close dates, different number ----
  const bySupplier = new Map<string, InvoiceDoc[]>();
  for (const d of docs) {
    const s = normalizeSupplier(d.supplier);
    bySupplier.set(s, [...(bySupplier.get(s) ?? []), d]);
  }
  for (const list of bySupplier.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]!;
        const b = list[j]!;
        const gap = daysBetween(a.date, b.date);
        if (gap > t.duplicateWindowDays) break;
        if (a.total <= 0 || Math.abs(a.total - b.total) >= 0.005) continue;
        findings.push({
          id: findingId('SUP-02', `${a.key}~${b.key}`),
          ruleId: 'SUP-02',
          severity: sev('SUP-02'),
          subject: `${a.supplier} · ${a.invoiceNo} / ${b.invoiceNo}`,
          params: { supplier: a.supplier, invoiceA: a.invoiceNo, invoiceB: b.invoiceNo, dateA: a.date, dateB: b.date, days: gap, total: a.total },
          amount: a.total,
          amountKind: 'invoiceTotal',
          evidence: [{ file: 'invoices', rows: [...a.rows, ...b.rows].sort((x, y) => x - y) }],
        });
      }
    }
  }

  // ---- SUP-03: unit price increases (on one copy of each invoice) ----
  const byItem = new Map<string, InvoiceRow[]>();
  for (const l of canonicalLines) {
    const item = l.sku ? `sku:${skuKey(l.sku)}` : l.description ? `desc:${textKey(l.description)}` : '';
    if (!item || l.qty <= 0 || l.unitPrice <= 0) continue;
    const key = `${normalizeSupplier(l.supplier)}|${item}`;
    byItem.set(key, [...(byItem.get(key) ?? []), l]);
  }
  for (const [key, ls] of byItem) {
    ls.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.row - b.row));
    for (let i = 1; i < ls.length; i++) {
      const prev = ls[i - 1]!;
      const cur = ls[i]!;
      const pct = ((cur.unitPrice - prev.unitPrice) / prev.unitPrice) * 100;
      if (pct <= t.priceIncreasePct + 1e-9) continue;
      findings.push({
        id: findingId('SUP-03', `${key}|${cur.row}`),
        ruleId: 'SUP-03',
        severity: sev('SUP-03'),
        subject: `${cur.supplier} · ${cur.description || cur.sku}`,
        params: {
          supplier: cur.supplier,
          item: cur.description || cur.sku,
          sku: cur.sku,
          prevPrice: roundRM(prev.unitPrice),
          newPrice: roundRM(cur.unitPrice),
          pct: Math.round(pct * 10) / 10,
          prevDate: prev.date,
          newDate: cur.date,
          invoiceNo: cur.invoiceNo,
          qty: cur.qty,
        },
        amount: roundRM((cur.unitPrice - prev.unitPrice) * cur.qty),
        amountKind: 'priceImpact',
        evidence: [{ file: 'invoices', rows: [prev.row, cur.row] }],
      });
    }
  }

  // ---- Payments: SUP-04 and SUP-05 ----
  const unmatched: PaymentRow[] = [];
  if (hasPayments) {
    const docsBySupplier = new Map<string, { doc: InvoiceDoc; norm: string }[]>();
    for (const d of docs) {
      const s = normalizeSupplier(d.supplier);
      docsBySupplier.set(s, [...(docsBySupplier.get(s) ?? []), { doc: d, norm: normalizeInvoiceNo(d.invoiceNo) }]);
    }
    const sorted = [...payments].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.row - b.row));
    const payCount = new Map<InvoiceDoc, number>();
    for (const p of sorted) {
      const cands = docsBySupplier.get(normalizeSupplier(p.supplier)) ?? [];
      const ref = normalizeInvoiceNo(p.reference);
      let match: InvoiceDoc | undefined;
      if (ref) {
        let bestLen = 0;
        for (const c of cands) {
          if (!c.norm) continue;
          if (ref !== c.norm && c.norm.length < 3) continue; // short numbers must match exactly
          const at = ref.indexOf(c.norm);
          if (at < 0) continue;
          const before = ref[at - 1];
          const after = ref[at + c.norm.length];
          const isDigit = (ch: string | undefined) => !!ch && /\d/.test(ch);
          if ((isDigit(before) && /^\d/.test(c.norm)) || (isDigit(after) && /\d$/.test(c.norm))) continue;
          if (c.norm.length > bestLen) {
            bestLen = c.norm.length;
            match = c.doc;
          }
        }
      }
      if (!match && p.amount > 0) {
        match = cands
          .map((c) => c.doc)
          .filter((d) => Math.abs(d.total - p.amount) < 0.005 && p.date >= d.date && daysBetween(d.date, p.date) <= t.paymentMatchWindowDays && (d.paid ?? 0) < d.total - t.paymentTolerance)
          .sort((a, b) => (a.date < b.date ? -1 : 1))[0];
      }
      if (!match) {
        if (p.amount > 0) unmatched.push(p);
        continue;
      }
      match.paid = roundRM((match.paid ?? 0) + p.amount);
      match.paymentRows.push(p.row);
      if (p.amount > 0) payCount.set(match, (payCount.get(match) ?? 0) + 1);
    }
    for (const d of docs) {
      const paid = d.paid ?? 0;
      d.outstanding = roundRM(Math.max(0, d.total - paid));
      if (paid > d.total + t.paymentTolerance) {
        const count = payCount.get(d) ?? 0;
        findings.push({
          id: findingId('SUP-04', d.key),
          ruleId: 'SUP-04',
          severity: sev('SUP-04'),
          subject: `${d.supplier} · ${d.invoiceNo}`,
          params: { supplier: d.supplier, invoiceNo: d.invoiceNo, total: d.total, paid, count, kind: count >= 2 ? 'paidTwice' : 'overpaid' },
          amount: roundRM(paid - d.total),
          amountKind: 'overpaid',
          evidence: [
            { file: 'invoices', rows: d.rows },
            { file: 'payments', rows: d.paymentRows },
          ],
        });
      }
    }
    for (const p of unmatched) {
      findings.push({
        id: findingId('SUP-05', String(p.row)),
        ruleId: 'SUP-05',
        severity: sev('SUP-05'),
        subject: `${p.supplier} · ${p.reference || '—'}`,
        params: { supplier: p.supplier, reference: p.reference, date: p.date, amount: p.amount },
        amount: p.amount,
        amountKind: 'payment',
        evidence: [{ file: 'payments', rows: [p.row] }],
      });
    }
  }

  // ---- Per-supplier summary ----
  const sums = new Map<string, SupplierSummary>();
  for (const d of docs) {
    const s = normalizeSupplier(d.supplier);
    const cur = sums.get(s) ?? { supplier: d.supplier, invoices: 0, total: 0, findings: 0 };
    cur.invoices++;
    cur.total = roundRM(cur.total + d.total);
    sums.set(s, cur);
  }
  for (const f of findings) {
    const s = sums.get(normalizeSupplier(String(f.params.supplier)));
    if (s) s.findings++;
  }
  const order: Record<string, number> = { 'SUP-01': 0, 'SUP-02': 1, 'SUP-04': 2, 'SUP-05': 3, 'SUP-03': 4 };
  findings.sort((a, b) => (order[a.ruleId] ?? 9) - (order[b.ruleId] ?? 9) || (b.amount ?? 0) - (a.amount ?? 0));
  return { invoices: docs, suppliers: [...sums.values()].sort((a, b) => b.total - a.total), unmatchedPayments: unmatched, findings };
}
