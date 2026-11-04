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

## Marketing kit (branch `marketing-kit`)

Made unattended; each decision logged here instead of asking.

- **Scope and guardrails in one brief.** `marketing/BRIEF.md` is the single source of facts, approved demo figures and banned claims for the AI marketing agent. `marketing/scripts/check-copy.mjs` (`npm run marketing:check`) fails on fraud/AI/guarantee/savings claims, on "replaces an accountant"/"tax advice" without a negation, and on demo figures shown without a demo-data label in the same paragraph, CSV row or page. It is a safety net; all copy was also read by hand.
- **Landing page is plain static HTML/CSS/JS** in `marketing/landing/`, not part of the Vite app, so it can be hosted alone and changed without touching the app. No framework, no build step, system fonts, and a CSP that allows only same-folder resources (no trackers can load).
- **Both languages and all three hero variants live in the HTML** and are shown or hidden with CSS from `data-lang`/`data-v` set by a 90-line script. There's no `innerHTML`, and it works without JavaScript (pitch A, English). Unknown `v`/`lang` values fall back to defaults; `src` is whitelisted to `[a-z0-9_-]{1,20}`.
- **Attribution without trackers:** the WhatsApp prefilled message carries a ref code `<pitch>-<source>` (e.g. `B-fbad`) taken from the URL. The person replying logs it in the tracking sheet. This is enough for a RM500 test and keeps the "no trackers" promise.
- **Placeholders:** WhatsApp number `60000000000` (not a valid Malaysian mobile, so it can't reach a real person by accident), Google Form `https://forms.gle/REPLACE_WITH_YOUR_FORM_ID`, accountant `[ACCOUNTANT NAME]` with a text avatar. The accountant's real name or photo goes in only with their consent.
- **No testimonials or social proof**, because we have none. The page says plainly that we can't promise findings or savings, and that a real shop may show more, fewer or none of the demo findings.
- **"Starting with a small number of shops"** is used instead of a hard number of pilot slots, because the sales kit's "2 pilots" target may grow with ads and fake scarcity is banned.
- **Screenshots are fresh captures** of the app on demo data (`marketing/scripts/capture-assets.mjs`), cropped per pitch and captured in both EN and 中文 so the page language matches the screenshots. Hero crops use a narrow 560 px viewport so the text stays legible when scaled down on phones. WebP, about 0.8 MB in total.
- **Region:** copy says "Penang" because the accountant is there and the ad test targets Penang. The FAQ doesn't promise service elsewhere.
- **Videos: one language per file** (EN UI + EN captions, 中文 UI + 中文 captions) rather than two caption lines on one video, because two stacked lines are hard to read on a phone and Xiaohongshu needs Chinese-only. So there are 8 MP4s: 60 s full ×2 and three 20 s clips ×2.
- **Full video is 16:9 (1920×1080) and clips are 9:16 (1080×1920)**, recorded on a phone-sized viewport, because the clips are for Reels/Stories/XHS and the full video is for the landing page, the feed and WhatsApp.
- **Frames come from Chromium's CDP screencast** (JPEG q92 at full device pixel ratio) through Playwright, not Playwright's built-in recorder, whose fixed low bitrate blurs small table text. ffmpeg turns the variable-rate frames into constant 30 fps H.264 `-preset veryfast -crf 21` with a silent AAC track (some uploaders reject video without audio).
- **Captions, cursor, demo badge and cards are page overlays**, so CJK text renders with the system fonts. They are manual popovers so they stay above the app's modal evidence dialog (browser top layer). The "Demo data · fictional shop" badge is on screen for the whole video.
- **Clips jump between pages directly; the full video clicks the real navigation**, to fit the 20 s length.
- **Landing page embeds a 1280×720 copy** of the 60 s video (about 1.9 MB each language, `preload="none"`, poster image) inside `landing/assets/` so the landing folder still deploys on its own.
- **Social posts are generated from one data file** (`marketing/scripts/social-data.mjs` → `npm run marketing:social`) so the Markdown and the CSV calendar can't drift apart. One post idea per day, with platform versions: Facebook = one bilingual post (EN then 中文) with a per-post ref link (`src=fb-dNN`); Instagram = bilingual caption + hashtags with "link in bio" (`src=ig`); Xiaohongshu = 中文 only, title ≤ 20 characters, call to action by comment/DM with **no WhatsApp, phone number or link**, because XHS restricts off-platform contact details.
- **Strict A → B → C rotation** (10 posts per pitch), so engagement can be compared per pitch. Educational posts (margin formula, stock sorting, invoice checks, CNY ordering checklist) are mixed with demo walkthroughs, trust/privacy posts and the pilot offer, so the feed isn't all selling.
- **Calendar starts Mon 9 Nov 2026** (next Monday after this work) and runs into the year-end and pre-CNY ordering season, which is why the hamper and CNY-ordering posts sit in late Nov/Dec. Suggested posting times (21:00 FB/IG, 20:00 XHS, after shop closing) are a starting guess to test, not data.
- **No customer claims:** "many owners share the report with their accountant" was removed because there are no customers yet; it now says "you're welcome to share…". The accountant post (day 13) and the 🎥 scripts need the accountant's approval and have no-face alternatives.
- **The copy checker has its own test** (`tests/unit/marketing-copy.test.ts`) and now parses CSV records (cells span lines), so each post, ad or lead row must carry its own demo label.
- **Ads use click-to-WhatsApp** (Engagement → WhatsApp) as the primary destination, with the landing page as a fallback, because the offer starts with a chat and every extra step loses small-business owners. Each ad's prefilled WhatsApp message carries its ref code (`<pitch>-ad-<pitch><n>-<lang>`), which replaces a tracking pixel.
- **Budget split: 3 ad sets × RM20/day × 7 days (RM420), then RM80 on the winner.** Ad set budgets rather than campaign budget optimisation, so each pitch gets equal spend. Each ad set starts with 4 ads (variants 1–2 in EN + 中文); variants 3–5 are replacements. The winner is chosen by demos booked, then cost per qualified lead, not by clicks. All thresholds (RM15 per ad, 0.5% CTR, RM100 per pitch, RM40 per conversation, RM150 per demo) are stated as starting assumptions, not benchmarks.
- **Scaling beyond RM500 requires a paid pilot** traced to an ad, and the tracking sheet's 3-week rule (0 paid pilots → stop) overrides any ad metric.
- **Ad copy avoids Meta's "personal attributes" problem:** no lines asserting the viewer's finances ("Is your shop losing money?"). Headlines are checked to ≤ 40 characters (EN) and ≤ 20 (中文) by the generator.
- **Targeting** is Penang, ages 25–65, languages English + Chinese (the only ad languages), small-business/retail interests as suggestions under Advantage+ audience, and Audience Network excluded. The creative (screenshots of a minimart, RM, invoices) is expected to do most of the targeting.
