# Progress log

## Phase 0 — ECC added
- Cloned ECC to a temp folder; copied 7 agents, 3 skills and the common rules into `.claude/`. No hooks copied. See `docs/DECISIONS.md`.

## Phase 1 — Plan and scaffold
- `docs/PLAN.md`: architecture, file structure, data model, phases, risks.
- Vite + React 19 + TypeScript (strict, `noUncheckedIndexedAccess`), Vitest, Playwright, ESLint (bans `dangerouslySetInnerHTML`).
- `index.html` carries a Content-Security-Policy with `connect-src 'none'` so the page cannot send data anywhere.
- `src/rules/rules.config.ts`: all 14 rules (id, plain-English description, thresholds, why it matters) and `settings.ts` (defaults, clamping, safe merge of stored settings). 5 unit tests.
- Started background subagents for the sales kit (Phase 6) and synthetic objection rehearsal (Phase 7).
