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

## Marketing agent (n8n) — `marketing-agent/`

Worked unattended on branch `marketing-agent`; decisions logged here instead of asking.

### Part 1 — foundations
- **Source of truth is code, not hand-edited JSON.** Workflows are generated by `marketing-agent/src/build.mjs` from `src/workflows/*.mjs`. Logic that runs inside n8n Code nodes lives in `src/lib/*.cjs` and is inlined at build time, so it is unit-tested once (`node --test`) and identical in every workflow (for example, the brand-rule check runs in the generator, publisher, lead inbox and reply sender).
- **Target n8n version:** current stable **n8n 2.46.6** (npm `latest`, Nov 2026). Node type versions were chosen to exist in **both 2.46.6 and 1.123.92** (last 1.x), so older self-hosted installs can import the workflows too. `scripts/validate.mjs` checks both, using n8n's own published node descriptions (`n8n-nodes-base/dist/types/nodes.json`) and `n8n-workflow`'s `NodeHelpers` for parameter checks.
- **Settings live in a "config" tab of the Google Sheet**, not in n8n. Only the sheet ID is typed into each workflow (a "Settings" node). Reasons: one place to edit for five workflows; n8n Variables (`$vars`) are not on every plan; a beginner can flip `DRY_RUN` without opening n8n. Secrets never go in the sheet: they stay in n8n credentials.
- **Safe defaults:** `DRY_RUN = TRUE` and `USE_FAKE_LLM = TRUE`. A fresh import posts nothing, sends nothing and needs no LLM key. Fake LLM text is tagged `[FAKE LLM TEST]`, and the publisher and reply sender refuse such text when `DRY_RUN` is FALSE.
- **Brand rules are enforced in code as well as in the prompt.** BLOCK rules (fraud/accusation words, "replaces your accountant", tax advice incl. LHDN/e-invoicing, guarantees, calling the product AI, audit claims, email addresses, placeholders, phone numbers other than ours) stop a post or reply even if a human approved it, because the check re-runs on the sheet text at send time. CHECK rules (RM figures or percentages without a demo-data label, pressure words, more than 4 hashtags, too long, company-name suffixes) are warnings only. Honest disclaimers ("not tax advice", "we can't guarantee") are allowed by a negation guard; Chinese negators must sit right before the match because 不 is common.
- **Demo-data label check runs on the post body only**, because the call to action itself says "fictional sample shop" and would otherwise count as a label. The real pilot fee (RM300, RM300–RM800) is excluded from the RM-figure warning.
- **The LLM never writes links, phone numbers or prices.** The call to action (wa.me link with `?text=PROFIT|STOCK|INVOICE`) is added by code, which also makes pitch attribution deterministic.
- **Pitch attribution:** the code in the WhatsApp link (or `m.me/?ref=CODE`), `ref: CODE` in text, or the code typed in upper case. Lower-case words ("my stock") do not count.
- **Lead IDs are an FNV-1a hash** of source + contact ID, so the ID does not expose a phone number.
- **Dates:** written as `YYYY-MM-DD HH:mm` Malaysia time with `cellFormat: RAW`; the reader also accepts day-first `DD/MM/YYYY` (Malaysian sheet locale), ISO strings and Sheets serial numbers. SETUP asks for the sheet locale to be Malaysia. A sheet set to the US locale would show month-first dates that the reader would misread; this is documented, not detected.
- **Fake test data** uses `6010000000x` numbers and `PSID_TEST_*` IDs. The validator rejects any other Malaysian phone number or non-`example.com` email anywhere in `marketing-agent/`.

### Part 2 — Workflow 1, content generator
- **Schedule: Friday 10:00 Malaysia time, writes next week's drafts** (`WEEK_OFFSET = 1`), so there is a weekend to approve. Workflow time zone is `Asia/Kuala_Lumpur`.
- **"Rotating 3 pitches" = every pitch every week, in a rotating order.** Three slots (default Mon/Wed/Fri 20:30), one pitch each, order shifted by ISO week number. Each pitch gets each weekday in turn and appears equally often, which keeps the per-variant comparison in the weekly report fair. Each slot is drafted in EN and casual Malaysian Chinese (6 drafts a week). BM can be added with `LANGUAGES = en,zh,ms`.
- **LLM node = HTTP Request to `{LLM_BASE_URL}/chat/completions`** with a Header Auth credential, not n8n's LangChain OpenAI node. It works with any OpenAI-compatible provider (OpenAI, OpenRouter, DeepSeek, Groq, a local Ollama), has a simple, version-stable parameter shape, and allows JSON mode (`LLM_JSON_MODE`, switch off if a provider rejects `response_format`). Retries 3 times.
- **Brand rules and brief are fetched by URL** (a secret GitHub Gist "Raw" link works). This works the same on n8n Cloud, which has no file system access. If the download fails, the fake-LLM test still runs; the real LLM is never called without both files.
- **A second run for the same week stops with a clear error** instead of duplicating or overwriting drafts (overwriting could undo approvals).
- **One text cell = exactly what gets published** (body + call to action + hashtags), so what you approve is what posts. The same text is used for Facebook and Instagram: the wa.me link is clickable on Facebook, and on Instagram people can read the number and the code.
- **Runtime test in real n8n.** `scripts/runtime-test.mjs` imports the workflows into a temporary n8n 2.46.6 (CLI, SQLite) with external nodes swapped for Code nodes of the same name, runs them, and reads results from n8n's execution database. Found during this: **n8n refuses to start a workflow if any node references a credential you cannot use, even on a branch that will not run** (for example "Call LLM" in fake mode). SETUP therefore asks for every credential to be created before the first test (a dummy LLM key is fine while `USE_FAKE_LLM = TRUE`). n8n 2.x needs Node.js 24+; `n8n execute` often reports "No active execution found" for fast runs, so results are read from the database instead.

### Part 3 — Workflow 2, publisher
- **"When a row is marked approved" is implemented as an hourly check (07:00–23:00 MYT), not a Google Sheets Trigger.** A polling Sheets Trigger fires on any edit (including the workflows' own writes), needs a second Google credential type and the Drive API, and cannot wait for `scheduled_for`. The hourly schedule posts approved rows at their scheduled hour; the default post time moved to 21:00 so it lines up with the hourly run.
- **n8n Cloud execution budget:** every scheduled run counts as an execution on n8n Cloud. Hourly 07:00–23:00 is about 520 executions a month. SETUP explains how to slow it down; self-hosted n8n has no limit.
- **One post per run**, oldest scheduled first. It keeps Meta rate limits and mistakes small (a wrongly approved batch cannot all go out at once).
- **Locking:** the row is set to `publishing` before anything is sent, and the final status is `posted`, `posted (dry run)` or `error`. A failed or half-done post (for example Facebook OK, Instagram failed) is **never retried automatically**: it becomes `error` with the Facebook ID kept and "Partly posted – check the Page", so nothing is posted twice.
- **Brand rules are re-checked at publish time** on the text as it is in the sheet (it may have been edited after drafting). BLOCK → `blocked`; the human edits and approves again.
- **Instagram requires an image** (`image_url`, public JPEG link); without one the row becomes `needs image` before anything is posted, so Facebook does not go out alone by surprise. Facebook posts with an image use `/{page}/photos`, without one `/{page}/feed`.
- **Meta Graph API via HTTP Request + n8n's "Facebook Graph API" credential** (Page access token as `access_token`), not the Facebook Graph API node, so request bodies are plain JSON and the API version is a config value (`GRAPH_API_VERSION`, default `v25.0`, the newest version listed in n8n 2.46.6's own Facebook node). Instagram: create container → wait 20 s → `media_publish`. **Unsure:** large images can take longer than 20 s to process; if `media_publish` reports the media is not ready, the row shows `error` and can be re-approved. A status-polling loop was not added, to keep the workflow simple.
- **Runtime-tested in n8n 2.46.6** with the real HTTP Request nodes pointed at a local mock Graph API (request paths and bodies asserted): dry run, live photo + Instagram, Instagram failure, text-only post, missing config.
