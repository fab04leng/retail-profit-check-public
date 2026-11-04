# Progress log

## Phase 0 — ECC added
- Cloned ECC to a temp folder; copied 7 agents, 3 skills and the common rules into `.claude/`. No hooks copied. See `docs/DECISIONS.md`.

## Phase 1 — Plan and scaffold
- `docs/PLAN.md`: architecture, file structure, data model, phases, risks.
- Vite + React 19 + TypeScript (strict, `noUncheckedIndexedAccess`), Vitest, Playwright, ESLint (bans `dangerouslySetInnerHTML`).
- `index.html` carries a Content-Security-Policy with `connect-src 'none'` so the page cannot send data anywhere.
- `src/rules/rules.config.ts`: all 14 rules (id, plain-English description, thresholds, why it matters) and `settings.ts` (defaults, clamping, safe merge of stored settings). 5 unit tests.
- Started background subagents for the sales kit (Phase 6) and synthetic objection rehearsal (Phase 7).

## Phase 2 — Data layer
- `src/core`: types, number and date parsing (Malaysian formats), CSV (PapaParse) and XLSX (read-excel-file) reading, header-row detection, column auto-mapping with English/Malay/Chinese synonyms, mapping validation, layout signatures for remembered mappings, row normalisation with friendly row-numbered issues, duplicate-SKU merge, blank CSV templates, formula-injection-safe CSV export, safe localStorage wrapper.
- `src/demo`: seeded RNG, invented catalogue (252 SKUs, 30 suppliers), generator for a fictional two-outlet Penang minimart, 3 Nov 2025 – 1 Nov 2026, with weekday/weekend, year-end, CNY and Ramadan/Raya patterns and planted issues (6 duplicate invoices, 10 below-cost products, 25 dead-stock SKUs, 4 price jumps, 2 overpayments, 2 unmatched payments).
- 123 unit tests passing (numbers, dates, mapping, normalisation edge cases incl. empty files, missing columns, refunds, duplicate SKUs, DD/MM/YYYY, thousands separators, corrupt/real XLSX, formula injection, templates, generator determinism).

## Phase 3 — Analyses
- Tests written first for each analysis (red), then implemented (green): `profit.ts` (product/category/outlet profit, PRF-02 below cost, PRF-03 below target margin), `stock.ts` (age buckets, dead/slow stock, days of cover), `suppliers.ts` (SUP-01..05: duplicate number, same amount within N days, price increase, overpaid/paid twice, unmatched payments; outstanding balances), `cashflow.ts` (8-week trend outlook, CSH-02), `summary.ts` (5 headline numbers linked to findings), `index.ts` (`runAll`).
- Accuracy test (`tests/accuracy`) runs the real upload pipeline on the demo data: all planted issues found, 0 false positives, in every category. `npm run demo:export` writes `demo/data/*.csv` and `demo/ANSWER_KEY.md` (with the accuracy table regenerated from the analyses).
- 190 tests passing; lint and type-check clean.

## Review fixes after Phase 3
- ECC security reviewer: fixed a HIGH quadratic-regex risk in `parseNumber` (length cap + no backtracking suffix check); added zip-bomb check (declared unzipped size), row/column/cell-length caps, UTF-16 decoding, formula guard for leading whitespace; CSP moved to a build-only plugin and `frame-src 'none'` added.
- ECC code reviewer: fixed 3 HIGH (cash flow without payments file treated all past invoices as overdue; multi-invoice payment references caused false overpayments; legitimate identical invoice lines halved the total) and 8 MEDIUM (synthetic unit prices in SUP-03, cover days on short files, slow-stock headline now reconciles via new STK-03 findings, zero unit cost treated as unknown, sign-fix of negative-price lines, partial first week in the trend + "insufficient history", "-RM 5.00", outlet receipts per day). 20 regression tests in `tests/unit/review-regressions.test.ts`.

## Phase 4 — UI and report
- React UI: Start (demo button, four upload cards with blank templates, column-mapping wizard with remembered layouts, data-issues panel with row numbers), Health check (5 headline RM numbers linked to evidence), Profit, Stock, Suppliers, Outlets, Cash flow (inputs, chart, weekly table, stated method), All findings (filters by area/review status/headline), Rules (plain-English rules with editable thresholds, re-analysis on change), Report (one-page owner summary + appendix; print CSS; CSV/Excel export).
- Every finding shows its rule id, severity, RM amount with what it means, "Needs review"/"Estimate" tags, "Why this matters", and a dialog with the exact source rows from the original files. Accountant review mode adds Confirmed / Not an issue / Needs info + note.
- Web Worker engine with in-page fallback; English, Simplified Chinese and Malay (translations by a subagent, verified by tests).
- Checked by screenshots on desktop and a phone viewport in Chinese: no horizontal page scroll, no console errors.
