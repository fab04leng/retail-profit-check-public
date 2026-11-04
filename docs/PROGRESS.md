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

## Phase 5 — Quality
- **E2E (Playwright, 16 tests):** demo journey through every page with screenshots; evidence dialog; headline → findings link; language switch EN → 中文 → BM (remembered after reload); accountant review mode (Confirmed / Not an issue + note → report counts); threshold change re-runs the analysis and "Reset all" restores it; cash-flow input changes the outlook; print view (navigation hidden, A4 PDF generated, owner summary fits page 1); CSV/Excel export; phone viewport with no horizontal scroll; uploads with Malay headers + title rows + bad rows (row-numbered issues); manual column fix remembered per layout; `.xls` friendly error; blank template download; crafted HTML/script cells rendered as text only; 100,000-row upload.
- **Performance:** 100,000 sales rows (9.4 MB CSV) parse 0.2 s, normalise 1.1 s, analyse 0.3 s in Node (`tests/perf`); in the browser the whole upload → analysis took ~1.4 s with **no main-thread long task** (work runs in the Web Worker). Main bundle 115 kB gzipped; the analysis core is loaded on the page only if the worker cannot start.
- **Screenshots** in `docs/screenshots/` (desktop, phone, Chinese, Malay, print) reviewed by eye. Fixed: duplicated "RM RM" in two texts, "1 weeks", raw ISO dates in one message, confusing "(Optional*)" mapping labels (now * required / † at least one), report key-number table cramped on phones, appendix overflowing on phones, Report heading missing the focus target id, sticky nav captured mid-page in full-page shots.
- **ECC react-reviewer (UI) fixes:** stale analysis results can no longer overwrite newer data (run-id guard; uploads and mapping disabled while busy); rejected remembered mappings no longer desync the engine; "clear everything" no longer re-saves settings; threshold/cash inputs keep a draft and clamp on blur instead of on every keystroke; stable `getRows` and memoised context (no evidence refetch on every render); visible focus ring on file pickers; crashed/slow worker is terminated and reported instead of hanging; review status buttons use `aria-pressed`; review saves moved out of the state updater.
- 225 unit/accuracy/perf tests, 16 e2e tests, lint and type-check all passing.

## Phase 6 — Sales kit
- Written by a subagent in English and Simplified Chinese (`sales-kit/`): one-page offer, 15-minute interview script (past-behaviour questions, no pitching until the end, commitment signals, pilot ask), WhatsApp outreach (with optional Malay versions), objection handling (11 objections), pilot agreement draft headed "DRAFT — must be reviewed by a lawyer before use" (Chinese version states the English prevails), 5-minute `DEMO_SCRIPT`, README.
- Checked against the built app: demo-script clicks and labels now match the real UI in both languages (See evidence → Show source rows, pre-filled demo cash inputs and the red week, PRF-03 "Flagged … times", review-mode switch, Print / save as PDF).
- Removed an overclaim in four places: the rules were described as "written with an accountant"; they are now described as rules an accountant can read, check and change (the ACCA partner has not reviewed them yet — see LIMITATIONS).

## Phase 7 — Objection rehearsal (synthetic, NOT market validation)
- A subagent wrote `research/rehearsal.mjs` (deterministic, seeded, no dependencies, no AI): 200 synthetic Malaysian retail-owner personas (shop type, size, outlets, state, language, age, digital comfort, accounting setup, pain flags) scored against pitches A (profit by product), B (cash stuck in stock) and C (supplier invoice mistakes) with documented if-then rules; outputs `personas.json`, `rehearsal-summary.json`.
- `research/REHEARSAL_REPORT.md`: prominent warning that synthetic responses are not evidence of demand or willingness to pay; method and assumptions; objections by frequency (overall and per pitch); pitch-by-segment tables; top 15 questions with honest answers; hypotheses and falsifiers for the 10 real interviews. A note was added that the Malay UI now exists, so Malay language-barrier objections in the simulation are overstated.
