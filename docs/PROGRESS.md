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
