# Retail Profit Check — Plan

A browser-only demo and pilot tool for Malaysian retail SMEs. It reads an owner's sales export, stock list, supplier invoices and (optionally) payments, runs deterministic, readable rules, and produces a health check that a qualified accountant reviews. It is a **sales and pilot tool**, not the final product.

## 1. Design constraints (from the brief)

| Constraint | How the design meets it |
|---|---|
| Accountant must trust it | Every check is a plain-English rule in `src/rules/rules.config.ts` with id, description, threshold, why it matters. Every finding carries its `ruleId` and the exact source rows (file + spreadsheet row number). No ML, no AI calls. |
| Data never leaves the computer (PDPA) | Static site, no backend, no network calls, no analytics. Files are read with `File.arrayBuffer()` in the browser. A Content-Security-Policy meta tag blocks outbound connections (`connect-src 'none'`). |
| Careful wording | Finding titles use "possible duplicate", "needs review". RM amounts are shown only when they are arithmetic on the input rows, and are labelled as such ("RM X below cost price on these rows"). Estimates (forecast) are labelled "estimate". |
| Works on laptop and phone | Responsive CSS, tables scroll horizontally inside their own container, print stylesheet for the report. |
| Never crash on bad files | Parsers return `{ rows, issues }`; every bad row becomes a friendly message with its row number. Analyses accept empty inputs. A React error boundary is the last line of defence. |

## 2. Architecture

```
            ┌──────────── Browser only ─────────────┐
 files ───▶ │ read (CSV: PapaParse, XLSX: read-excel-file)
            │   ▼                                    │
            │ column mapping (auto-detect EN/BM/中文 headers, user fixes, remembered per layout)
            │   ▼                                    │
            │ normalise + validate (numbers, dates, row issues)
            │   ▼                                    │
            │ analyses (pure TS functions, rules config) ── runs in a Web Worker for big files
            │   ▼                                    │
            │ findings + metrics ─▶ React UI ─▶ review state (localStorage) ─▶ printable report
            └────────────────────────────────────────┘
```

- **Pure core (`src/core`, `src/analysis`, `src/rules`)** has no React and no DOM: it runs in Vitest, in Node scripts (demo export), in the Web Worker and on the main thread.
- **Web Worker (`src/worker`)** runs normalisation + all analyses so 100,000-row files don't freeze the page. Falls back to the main thread if workers are unavailable.
- **UI (`src/ui`)** React 19 + TypeScript, hash-based navigation (works from `file://` and any static host), no router dependency, hand-made SVG/CSS charts (no chart library, small bundle).
- **i18n (`src/i18n`)**: `en.ts` is the source of truth; `zh.ts` and `ms.ts` must satisfy the same TypeScript type, so a missing key fails the type-check.

## 3. File structure

```
src/
  core/        types.ts, numbers.ts, dates.ts, csv.ts, xlsx.ts, mapping.ts, fields.ts, normalize.ts, templates.ts, exportCsv.ts, storage.ts
  rules/       rules.config.ts (single source of all thresholds), settings.ts
  analysis/    profit.ts, stock.ts, suppliers.ts, cashflow.ts, summary.ts, index.ts (runAll)
  demo/        rng.ts, catalog.ts, generate.ts (seeded synthetic Penang minimart + planted issues)
  worker/      analysis.worker.ts, client.ts
  i18n/        en.ts, zh.ts, ms.ts, index.tsx
  ui/          App.tsx, pages/*, components/*, styles.css
tests/
  unit/        one file per module, edge cases
  accuracy/    demo data vs answer key, false-positive report
  perf/        100,000 sales rows
e2e/           Playwright specs + screenshots → docs/screenshots/
scripts/       export-demo.ts (writes demo CSVs + ANSWER_KEY.md)
demo/          ANSWER_KEY.md, data/*.csv
sales-kit/     offer, interview script, WhatsApp, objections, pilot agreement draft, DEMO_SCRIPT
research/      synthetic objection rehearsal (NOT validation)
docs/          PLAN, PROGRESS, DECISIONS, LIMITATIONS, screenshots
```

## 4. Data model (normalised)

All dates are ISO `YYYY-MM-DD` strings (structured-clone safe, sortable). Each row keeps `row`: the spreadsheet row number the user sees (header = row 1).

- `SaleRow { row, date, receipt, sku, name, category, qty, unitPrice, discount, total, outlet? }`
- `ProductRow { row, sku, name, category, unitCost, qtyOnHand, lastReceived? }`
- `InvoiceRow { row, supplier, invoiceNo, date, sku?, description, qty, unitPrice, total, dueDate? }`
- `PaymentRow { row, date, supplier, amount, reference? }`
- `Finding { id, ruleId, severity, params, amount?, evidence: { file, rows[] }[] }`

## 5. Analyses (all deterministic, all thresholds from rules config)

1. **Profit** — per SKU and category: revenue (net of discounts and refunds), COGS = net units × unit cost, gross profit, margin %. Flags: sold below cost (average net price < unit cost), below target margin (default 25%).
2. **Stock** — days since last sale per SKU, value by age bucket (0–30, 31–60, 61–90, 91–180, 180+), dead stock (no sale > 90 days), slow stock (> 60 days), days of cover (on hand ÷ average daily units over last 90 days).
3. **Suppliers** — possible duplicate (same supplier + invoice no.; same supplier + same amount within 7 days), unit price rise > 5% vs previous price from the same supplier for the same item, overpaid / paid twice, payments with no matching invoice.
4. **Cash flow** — 8-week outlook. Sales: least-squares straight-line trend through the last 8 complete weeks, extended 8 weeks, floored at 0. Out: unpaid supplier invoices by due date (overdue → week 1), fixed monthly costs on their day of month, optional estimated restocking (forecast sales × historical cost ratio, paid after typical supplier terms). Flags weeks whose closing balance falls below the minimum (default RM 0).
5. **Health check** — 3–5 headline RM numbers, each linking to the findings/rows behind it.

## 6. Phases

0. ECC tooling → 1. plan & scaffold → 2. data layer + demo data → 3. analyses (TDD) + accuracy → 4. UI, review mode, report, EN/中文 → 5. e2e, screenshots, perf, reviews → 6. sales kit → 7. synthetic objection rehearsal → 8. README, limitations, PR → stretch (BM, outlets, POS adapters, reorder, Excel export, a11y).

## 7. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Messy real exports (title rows above headers, Malay headers, DD/MM vs MM/DD) | Mapping wizard with manual override; header-row detection; per-column date-order detection; row-level issues instead of failures. |
| False positives erode the accountant's trust | Conservative rules, "possible"/"needs review" wording, review mode with "Not an issue", accuracy test reports false positives on demo data. |
| Large files freeze the UI | Web Worker, single-pass grouping (Maps), perf test with 100k rows. |
| Unit cost only from current stock list (no FIFO) | Stated in method text and LIMITATIONS; accountant can adjust. |
| Forecast mistaken for a promise | Method shown next to the chart; labelled "estimate"; editable inputs. |
| XSS / CSV formula injection from file contents | React text rendering only (no `dangerouslySetInnerHTML`), CSP, exported cells starting with `= + - @ \t \r` are prefixed with `'`. |
| SheetJS npm package has known CVEs and the fixed build's CDN is blocked here | Use `read-excel-file` / `write-excel-file` (see DECISIONS). |
