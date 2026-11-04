# Decisions log

Decisions made while working unattended. Each entry: what was unclear, what was decided, why.

## Phase 0 — ECC

- **ECC source:** cloned `https://github.com/affaan-m/ECC` (commit `b38be6a7f6350964d59328b52f0624e1d1d552d1`) into a temp folder outside the repo.
- **Copied:** agents `planner`, `tdd-guide`, `code-reviewer`, `security-reviewer`, `typescript-reviewer`, `react-reviewer`, `e2e-runner`; skills `tdd-workflow`, `verification-loop`, `e2e-testing`; all of `rules/common/`.
- **Excluded `rules/common/hooks.md`.** It is a guidance document about hooks, not a hook, but the brief says "do not copy any hooks"; leaving it out is the safest reading. No `hooks/` content or `settings.json` hook config was copied.
- **Licence:** ECC is MIT-licensed; its licence is kept at `.claude/ECC-LICENSE`.
- **Subagent registration:** in this cloud session the ECC agents are already available as `ecc:*` subagent types (from an installed plugin), so they are used directly rather than via a general-purpose agent.

## Phase 1 — Stack

- **Excel library:** the npm `xlsx` (SheetJS 0.18.5) package has known advisories (prototype pollution, ReDoS) and the fixed builds are only published on `cdn.sheetjs.com`, which this environment's network policy blocks. Chose `read-excel-file` (reading `.xlsx`, works in a Web Worker) and `write-excel-file` (exporting findings). Old binary `.xls` files are not supported; the UI asks the user to save as `.xlsx` or CSV.
- **No router / chart library / i18n library:** hash navigation, hand-drawn SVG/CSS bars and a typed dictionary keep the bundle small and the code auditable.
- **Dev-only advisories:** `npm audit` reports moderate advisories in ESLint's dependency tree (minimatch). They affect the lint tool only, are not shipped in the static site, and are left as is.
- **Latest major versions** (React 19, Vite 8, Vitest 5, TypeScript 6) were used because the repo is new; `@playwright/test` is pinned to 1.63.0 to match the pre-installed Chromium.

## Phase 2 — Data layer

- **Dates:** day-first (DD/MM/YYYY) is the default, as in Malaysia. A date column is read month-first only if one of its values has a middle part above 12 and none has a first part above 12. Two-digit years mean 20YY. Excel serial numbers and Malay/English month names (e.g. "5 Ogos 2026", "31 Dis 2025") and `2026年1月12日` are accepted.
- **Numbers:** `RM`/`MYR` prefixes, thousands commas, `(12.00)` and `12.00-` negatives, full-width digits and European `1.234,56` are accepted. `1,234` is always one thousand two hundred and thirty-four.
- **Sales total:** if a Total column is mapped, it is taken as the net line amount after discount. Otherwise total = qty × unit price − discount. A `10%` discount is converted to RM.
- **Refund signs:** a line with positive quantity and negative amount (or the reverse) is treated as a refund (both negative) and a warning is shown, because POS exports differ.
- **Sales without SKU:** the product name becomes the key; at least one of SKU/name is required. Same for the product list.
- **Duplicate SKUs in the product list** (e.g. one row per outlet): quantities are added, unit cost becomes the quantity-weighted average, and a warning lists the rows.
- **Negative stock on hand** is kept with a warning and counted as zero in stock value. **Negative unit cost** rejects the row.
- **Row numbers** are the row numbers the user sees in Excel (header row included, blank lines kept), so evidence can be found in the original file.
- **Header row detection:** the first of the top 15 rows that matches the most known column names, so report titles above the header are skipped.
- **Remembered mappings:** stored per file layout (hash of normalised headers) in `localStorage`, wrapped in try/catch. Only the mapping (column numbers) is stored — never file contents.
- **Text from files** is trimmed, stripped of control characters and capped at 200 characters; it is only ever rendered as text.
- **Demo data:** generated in the browser from a fixed seed (no large file download needed); the same generator writes `demo/data/*.csv` for people who want to try the upload flow. Supplier and shop names are coined words chosen to avoid matching real businesses; product names are generic descriptions without brands.
- **Answer key timing:** the planted cash-crunch week depends on the cash-flow method, so `demo/ANSWER_KEY.md` is generated (from the generator's own planted list) together with the analyses in Phase 3.

## Phase 3 — Analyses

- **Unit cost** comes from the product list (current cost) and is applied to all sales in the period. No FIFO/weighted history. Simple and transparent; noted as a limitation.
- **Category** for profit comes from the product list when the SKU is there (master data), else from the sales file.
- **Below cost** is judged on the product's average net selling price across the period (not single lines), so one promotional sale does not trigger it. The RM figure is cost of goods sold − revenue on those rows.
- **Low margin** excludes below-cost products (they already have a stronger finding). Its RM figure ("gap to target") is shown but never added into headline totals.
- **Stock age** counts from the last sale (refunds ignored). Never-sold items age from their last received date, or from the first sales date. Dead stock = more than 90 days, matching the 91–180 bucket boundary.
- **Invoice copies:** lines with the same supplier + normalised invoice number form one invoice. Copies on other dates, or all lines repeated on the same date, are SUP-01 findings; for payments and cash flow the invoice counts once (first copy).
- **SUP-02** compares invoice totals exact to the sen, within the window, different invoice numbers.
- **SUP-03** compares each invoice line with the previous line for the same supplier + SKU (or description), using one copy of each invoice. Exactly 5% is not "more than 5%". The RM figure is the extra paid on that line versus the previous price.
- **Payment matching:** reference contains the invoice number (short numbers must match exactly; a number is not matched inside a longer number). Otherwise exact amount, same supplier, on/after invoice date, within 120 days, to an invoice not yet fully paid. Negative payments (supplier refunds) reduce the paid amount if matched, and are never flagged as unmatched.
- **Without a payments file**, payment rules do not run and the cash-flow outlook treats invoices due on/after the forecast start as unpaid (earlier ones assumed paid).
- **Cash-flow method:** least-squares line through the last 8 complete Monday–Sunday weeks, extended 8 weeks, floored at zero. Cash in = forecast sales (retail is mostly cash/card). Out = unpaid invoices by due date (overdue → week 1), fixed monthly costs on their day of the month, and (optional, default on) estimated restocking = forecast sales × historical cost ratio, paid `round(terms/7)` weeks later. Possible duplicate invoices that are unpaid stay in the outlook (prudent); the accountant can mark them.
- **Demo calibration:** the demo opening balance (RM 20,000) and fixed costs were chosen so exactly one week (16–22 Nov 2026) dips below zero, driven by the planted year-end orders. This calibration is stated in the answer key.

## Phase 4 — UI

- **Engine in a Web Worker:** files are read, normalised and analysed in a worker; the page asks it for source rows on demand when someone opens the evidence for a finding (max 200 rows shown, all row numbers listed). If the worker cannot start within 4 s (e.g. `file://`), the same engine runs on the page.
- **Hash navigation** (`#/profit`) only ever carries page names, a rule id or a headline key — never file contents.
- **Persisted in localStorage** (all wrapped in try/catch): language, review-mode toggle, thresholds, cash-flow inputs (separately for demo and own files), column mappings per layout, and review statuses/notes per dataset (demo, or a hash of the files' layouts, row counts and names). "Clear data and remembered settings" removes all of it.
- **Review statuses:** Confirmed / Not an issue / Needs info, with a note. Typing a note on an unreviewed finding marks it "Needs info". The report counts confirmed findings (and their RM total, excluding estimates and margin gaps) separately from unreviewed ones.
- **Colours:** single blue series for magnitude charts; the reserved "critical" red only for below-minimum cash weeks and always with an icon and a text label. Light theme only (a printed/business tool); system fonts only (no web-font download).
- **Malay translation** was produced in the same pass as Chinese (stretch goal 1) because it costs little extra; all three dictionaries are checked for identical keys and placeholders by `tests/unit/i18n.test.ts`.
- **Outlet comparison page** (stretch goal 2) was added with the core UI because the profit analysis already groups by outlet.
- **Excel export of findings** (stretch goal 5) uses `write-excel-file`, loaded only when clicked; text cells are written as strings (never formulas) and guarded against formula injection; CSV export uses the same guard.
- **Demo shop name** stays in English in all languages (it is data, not UI text).

## Phase 5/8 — Builds
- **Two builds:** `npm run build` → `dist/` for any static host or `npm run preview` (Web Worker, CSP). `npm run build:offline` → `dist-offline/` that opens from `file://` by double-click (classic script, no worker, same CSP). Both are covered by e2e tests.

## Stretch goals
- **POS/accounting presets are hints, not parsers.** They only add vendor-style header names to the column auto-detection; the user still confirms the mapping. Because no real AutoCount, SQL Account, StoreHub or Loyverse export was available and the vendor help sites were unreachable from this environment, every preset is marked "unverified" and every header is tagged "documented" or "guess" in `src/core/adapters.ts`. Before relying on one, export a small real file and adjust the preset.
- **Detection needs two vendor-specific headers** (generic names like "Date" or "SKU" don't count), so ordinary files are not mislabelled.
- **Reorder suggestions** are a "method" rule (STK-05), not a finding: they are estimates to discuss with suppliers, so they are not counted in findings, headlines or review status.
