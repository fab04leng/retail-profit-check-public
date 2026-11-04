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
