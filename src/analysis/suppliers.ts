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

/** Does the normalised reference contain this invoice number, not as part of a longer number? */
export function referenceContains(ref: string, norm: string): boolean {
  if (!norm) return false;
  if (ref === norm) return true;
  if (norm.length < 3) return false; // short numbers must match exactly
  const isDigit = (ch: string | undefined) => !!ch && ch >= '0' && ch <= '9';
  for (let at = ref.indexOf(norm); at >= 0; at = ref.indexOf(norm, at + 1)) {
    const before = ref[at - 1];
    const after = ref[at + norm.length];
    if (isDigit(before) && isDigit(norm[0])) continue;
    if (isDigit(after) && isDigit(norm[norm.length - 1])) continue;
    return true;
  }
  return false;
}

/**
 * Invoice numbers written in a payment reference with their separators kept, e.g.
 * "INV001, INV001A" → INV001 and INV001A; "Pay INV-0012" → INV0012 (a run of adjacent tokens).
 * Returns the indexes of `norms` that equal one token or a run of adjacent tokens.
 */
export function referenceTokenMatches(reference: string, norms: string[]): number[] {
  const tokens = reference.toUpperCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const spans = new Set<string>();
  for (let i = 0; i < tokens.length; i++) {
    let s = '';
    for (let j = i; j < tokens.length && j < i + 6; j++) {
      s += tokens[j];
      spans.add(s);
    }
  }
  return norms.flatMap((n, i) => (n && spans.has(n) ? [i] : []));
}

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
    for (const l of g) {
      const list = byDate.get(l.date);
      if (list) list.push(l);
      else byDate.set(l.date, [l]);
    }
    const entries: Entry[] = [...byDate.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, ls]) => ({ date, lines: ls, total: roundRM(ls.reduce((a, l) => a + l.total, 0)) }));
    const first = entries[0]!;
    // Same date, every line repeated k times → keyed in k times.
    // Requires at least two different lines, each with an SKU or description, so two
    // genuinely identical lines on one invoice are not mistaken for a re-keyed invoice.
    let repeat = 1;
    /** Every line repeated the same number of times, but too few lines to be sure it was keyed twice. */
    let possibleRepeat = 1;
    if (first.lines.every((l) => l.sku || l.description)) {
      const counts = new Map<string, number>();
      for (const l of first.lines) counts.set(lineSig(l), (counts.get(lineSig(l)) ?? 0) + 1);
      let min = Infinity;
      for (const x of counts.values()) min = Math.min(min, x);
      const uniform = min >= 2 && [...counts.values()].every((x) => x === min);
      if (uniform && first.lines.length >= 4 && counts.size >= 2) repeat = min;
      else if (uniform) possibleRepeat = min; // flagged for review; the total stays as entered
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
    const copies = entries.length > 1 ? entries.length : Math.max(repeat, possibleRepeat);
    if (copies > 1) {
      const extra =
        entries.length > 1
          ? roundRM(entries.slice(1).reduce((a, e) => a + e.total, 0))
          : repeat > 1
            ? roundRM(total * (repeat - 1))
            : roundRM((first.total / possibleRepeat) * (possibleRepeat - 1));
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
    const list = bySupplier.get(s);
    if (list) list.push(d);
    else bySupplier.set(s, [d]);
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
    // Lines without quantity or unit price have no real unit price (different order sizes ≠ price rise).
    if (!item || l.priceUnknown || l.qty <= 0 || l.unitPrice <= 0) continue;
    const key = `${normalizeSupplier(l.supplier)}|${item}`;
    const list = byItem.get(key);
    if (list) list.push(l);
    else byItem.set(key, [l]);
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
      const list = docsBySupplier.get(s);
      const entry = { doc: d, norm: normalizeInvoiceNo(d.invoiceNo) };
      if (list) list.push(entry);
      else docsBySupplier.set(s, [entry]);
    }
    const sorted = [...payments].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.row - b.row));
    const payCount = new Map<InvoiceDoc, number>();
    for (const p of sorted) {
      const cands = docsBySupplier.get(normalizeSupplier(p.supplier)) ?? [];
      const ref = normalizeInvoiceNo(p.reference);
      // 1a. Invoice numbers written as separate items in the reference ("INV001, INV001A").
      //     Separators are kept, so a number is never swallowed by a longer one next to it.
      let matched = referenceTokenMatches(p.reference, cands.map((c) => c.norm)).map((i) => cands[i]!.doc);
      if (!matched.length && ref) {
        // 1b. Otherwise: numbers inside the reference text, e.g. "PAYINV0012" (no separators to go by).
        const byRef = cands.filter((c) => referenceContains(ref, c.norm)).map((c) => c.doc);
        // Drop numbers that are part of a longer matched number (e.g. "INV1" inside "INV12").
        matched = byRef.filter((d) => !byRef.some((o) => o !== d && normalizeInvoiceNo(o.invoiceNo).includes(normalizeInvoiceNo(d.invoiceNo))));
      }
      let targets: InvoiceDoc[] = matched.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      // 2. Otherwise: same supplier, exact amount, on/after the invoice date, not yet paid.
      if (!targets.length && p.amount > 0) {
        const byAmount = cands
          .map((c) => c.doc)
          .filter((d) => Math.abs(d.total - p.amount) < 0.005 && p.date >= d.date && daysBetween(d.date, p.date) <= t.paymentMatchWindowDays && (d.paid ?? 0) < d.total - t.paymentTolerance)
          .sort((a, b) => (a.date < b.date ? -1 : 1))[0];
        if (byAmount) targets = [byAmount];
      }
      if (!targets.length) {
        if (p.amount > 0) unmatched.push(p);
        continue;
      }
      // One payment for several invoices: fill each up to its open amount, oldest first; any excess goes on the last.
      let left = p.amount;
      targets.forEach((d, i) => {
        const open = Math.max(0, d.total - (d.paid ?? 0));
        const part = i === targets.length - 1 ? left : Math.min(left, open);
        left = roundRM(left - part);
        d.paid = roundRM((d.paid ?? 0) + part);
        d.paymentRows.push(p.row);
        if (p.amount > 0 && part > 0) payCount.set(d, (payCount.get(d) ?? 0) + 1);
      });
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
