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
