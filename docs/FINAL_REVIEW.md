# Final review — fresh eyes

**Branch:** `final-review` (from `main` after the three merges) · **Date:** 5 Nov 2026 · **Rules version:** `179bfdc7`

I re-read the repository as two sceptical reviewers:
- **a senior engineer**, asking "where does this break on real files?";
- **a Malaysian accountant**, asking "what would I refuse to put my name to?".

The review was done inline: reading the code, running the five messy fixtures through the real import path, and searching all copy (app, landing page, sales kit, ads, social posts, marketing-agent brand rules) for prices, promises and "accountant" wording. Critical and high issues were fixed on this branch. Everything still open is listed below with a severity.

---

## 1. Fixed on this branch

| # | Area | Issue | Sev. | Fix |
|---|---|---|---|---|
| 1 | Import | An Excel stock balance with a merged two-row header (`Item` › `Code`, `Cost (RM)` › `Unit`) picked the wrong header row, so the file was unusable without hand-mapping. | High | Group rows of merged cells are folded into the column names (`Item Code`, `Cost (RM) Unit`) for header detection and mapping (`src/core/mapping.ts`). |
| 2 | Import | Refunds shown with positive numbers and a `Receipt type = Refund` column, and `Void` lines, were counted as sales. This overstated revenue. | High | New optional line-type column: refunds become negative, voids are skipped with a message. |
| 3 | Import | Supplier invoices with `Amount excl. SST` and `Total incl. SST` used the before-tax amount, so SST-inclusive payments would not match. This produces false "overpaid / no matching invoice" findings. | High | Money fields prefer before-tax amounts for sales and after-tax amounts for invoices and payments. Tax-only columns (`SST 10%`, `SST Amount`) are never mapped. |
| 4 | Import | With both `Total` and `Net Total` (or `Amount` / `Net Amount`), the first (gross) column won. That overstated revenue and margin by every discount. | High | The net / after-discount column wins ties; gross loses. |
| 5 | Import | A merged header lost the SKU and net-amount columns, so a refund written `(38.90)` was recomputed from price × quantity and counted as a sale. | High | Fixed by #1. Covered by fixture 1. |
| 6 | App | The `zeroCost` and `negativePrice` warnings had no text, so owners saw raw keys (`issues.zeroCost`). | Medium | Messages added in EN / 中文 / BM. A test checks that every issue code and column name has text in every language. |
| 7 | Import | "Printed by…" / "Page 2 of 3" lines and `Jumlah Keseluruhan` total rows were reported as errors. | Medium | Single-cell note rows are skipped quietly; more total-row labels are recognised. |
| 8 | Import | Ambiguous dates (every date ≤ 12/12) were silently read day-first. | Medium | Warning when a date column is ambiguous or mixes day-first and month-first dates. |
| 9 | Accountant | The report said "Confirmed means … checked against the documents". In a pilot the accountant mostly sees exports, not source documents. | High | Now "…against the documents or records the shop provided. It is not an audit." (3 languages). |
| 10 | Copy | `sales-kit/01-offer` (EN + 中文) claimed "Most retail owners we speak to…" (before any interviews), "often a few thousand ringgit" (no evidence) and "nobody notices until year-end". | High | Rewritten without unsupported claims. It now also says "It is a check, not an audit". |
| 11 | Copy | App rule text: "often paid twice", "Accountants say these are usually found only at year-end audit", "Overpayments are recoverable". | Medium | Softened to "may", "the accountants we spoke to said…" and "may be recoverable" in 3 languages. The rules version changed, so the accountant pack was regenerated. |
| 12 | Copy | "Never shared or sold" in the offer and the landing page's privacy section, while the agreement says "except where required by law". | Medium | Offer and landing privacy section now add "unless the law requires it". Short ads: see open item 14. |
| 13 | Copy | English used two terms: "accountant-reviewed" (offer) and "accountant-checked" (brief, landing page, ads). | Low | The offer now uses "accountant-checked", as the marketing brief specifies (中文 is 会计师复核 everywhere). |
| 14 | Process | The partner accountant had not reviewed the rules, and there was no easy way for them to. | High | Printable rule-review pack with sign-off (`docs/accountant-review/`). Signing it is still open: see open item 1. |

## 2. Checked and consistent

- **Pilot price RM300** appears consistently in the sales kit, landing page, ads, social posts, marketing brief, agent brand rules and agreement draft.
- **Monthly price** ("testing, around RM300–RM800/month depending on outlets") appears only in the offer and demo script, always marked as being tested. It is not in public copy.
- **Timeline:** "about 2 weeks from complete files" everywhere, matching the agreement (~Day 14). The onboarding guide refers to the agreement rather than restating it.
- **Disclaimers** (not audited accounts, not tax advice, not a replacement for an accountant, no promised savings) are on the app, report, landing page, offer and agreement.
- **"No AI"** is always about owner data or the demo, never about the business as a whole. There is no claim that the rules were written, set or approved by the accountant.
- **Demo figures** are labelled as demo data (`npm run marketing:check` passes), and no testimonials or customer claims are made.
- **Security:** CSP `connect-src 'none'`; file content rendered as text only; formula injection guarded in exports; 0 production audit findings. New code: the pack HTML escapes every value, and the new header and row regexes are simple alternations on short, capped strings.

## 3. Still open

### Must do before the first paid pilot
1. **Accountant signs the rule-review pack** (`docs/accountant-review/rule-review-pack.en.pdf` or `.zh.pdf`, version `179bfdc7`). Then change `rules.config.ts` to match, regenerate (`npm run accountant:pdf`), and give them the new version.
2. **A lawyer reviews the pilot agreement draft.** Open points: SST on the fee, e-invoicing, deletion periods, PDPA roles, the refund clause, and how the reviewing accountant is engaged.
3. **Confirm the reviewer's title and registration before any ad runs.** The copy says "ACCA-qualified accountant" and "qualified accountant, Penang". In Malaysia, the use of accountant titles and the provision of accounting services can be restricted to registered members of the Malaysian Institute of Accountants (Accountants Act 1967). Confirm the reviewer's MIA registration, or have the wording checked.
4. **Independence and cover.** If the reviewer is also a pilot shop's auditor or tax agent, check the professional-ethics rules first. Also confirm professional indemnity cover for this work.
5. **Get one real export early.** None of the POS presets and none of the onboarding export steps have been tested on a real Loyverse, StoreHub, AutoCount or SQL Account file. Ask for a sample export at the first call, before the fee is paid.
6. **Fill the placeholders:** WhatsApp number, Google Form, `[ACCOUNTANT NAME]` and photo (only with consent), and the landing page URL in posts and ads.
7. **Define "Confirmed" in the pilot process.** For supplier findings (SUP-01–05), ask for the supplier statement or invoices before marking a finding *Confirmed*. Without them, use *Needs info*.

### Product and engineering
| # | Issue | Sev. | Suggestion |
|---|---|---|---|
| 8 | No manual choice of date order (DD/MM vs MM/DD) or header row. The app now warns, but the owner cannot correct it. | Medium | **Date order fixed on `quick-fixes`.** The column-mapping screen has a "Day/month order" selector (Automatic / DD/MM/YYYY / MM/DD/YYYY, in EN / 中文 / BM). Automatic shows what it detected. A chosen order overrides detection for every date column in that file, removes the "could be either" warning, and is remembered for the same file layout. The date warnings now point to the selector. Tests: `tests/unit/date-order-choice.test.ts`, `e2e/upload.spec.ts`. **Still open:** a header-row selector. |
| 9 | An invoice delivered in parts under one number keeps only the first date's total. A payment for the full amount then shows as possibly overpaid (SUP-04) as well as SUP-01. | Medium | Treat same-number lines on different dates with different items as one invoice, or show both findings as one. |
| 10 | Unit cost is the current cost for the whole period. The pack's PRF-02 example shows how this inflates "below cost" after a supplier price rise. | Medium | When supplier invoices exist, use the invoice price in force at each sale date. |
| 11 | One margin target for all products. Thin-margin staples will produce most of the "Not an issue" reviews. | Medium | Per-category targets (the pack asks the accountant for them). |
| 12 | SST inside a single sales total is not separated (only separate before/after-tax columns are handled). | Low | Optional "prices include SST at x%" setting. |
| 13 | The lead inbox (`marketing-agent/`) sends prospects' WhatsApp and Messenger messages to an LLM provider to draft replies. The landing page and greeting do not say so. | Medium (privacy) | **Notice fixed on `quick-fixes`.** The automatic first reply to a new contact (EN / 中文 / BM), a new WhatsApp Business greeting message (`marketing/ads/README.md` §6, EN / 中文) and a new landing-page FAQ entry ("Who writes your WhatsApp replies?", EN / 中文) now say that replies may be drafted with an AI writing tool and are checked by a person before sending. The FAQ also says the message text is sent to that service. Tests: `marketing-agent/tests/lib.test.mjs`, `tests/unit/ai-drafting-notice.test.ts`. **Still open:** use a provider with a data-processing agreement, or turn the LLM drafting off. |
| 14 | Short ads and social posts say "never shared or sold" without "unless the law requires it". | Low | Lawyer to confirm the shorthand is acceptable. |
| 15 | Landing page pitch codes (`A/B/C-<source>`) are not recognised by the lead inbox (`PROFIT/STOCK/INVOICE`), so those leads count as "unknown" in the weekly report. | Low | **Fixed on `quick-fixes`.** `detectPitch` now maps the letter codes A→profit, B→stock, C→invoice, from "ref B-fb-d07" in a message, a whole-message code such as `A-xhs`, or an m.me ref. Ordinary text ("Plan B", "A-grade") is not counted. Tests in `marketing-agent/tests/lib.test.mjs`. |
| 16 | SUP-05 flags payments early in the period for invoices from before the file starts. | Low | The onboarding guide asks for 1–2 extra months of invoices. Optionally ignore payments in the first N days. |
| 17 | Two separate brand-rule files (`marketing/BRIEF.md`, `marketing-agent/brand-rules.md`) must be kept in step by hand. | Low | **Fixed on `quick-fixes`** (test added; files not merged). `tests/unit/brand-rules-sync.test.ts` reads the brief's "Never say" list and the agent's "Banned claims" table. It fails if a claim is banned in one file and not the other. Agent-only rules (B7 emails, B8 placeholders, B9 phone numbers, monthly prices) are listed in the test with a reason. |
| 18 | Dev dependencies: 10 moderate `npm audit` findings (minimatch via dev tooling). Production: 0. | Low | Update dev tooling when convenient. |
| 19 | No screen-reader user testing; Safari and Firefox untested; light theme only. | Low | Unchanged from `docs/LIMITATIONS.md`. |
| 20 | Regenerated PDFs differ by their embedded timestamp, so they show as changed even when the content is the same. | Low | Only regenerate when rules or notes change (the test catches stale Markdown and HTML). |

### Notes for the conversation with the accountant
- Stock "age" is days since the last sale, not GRN ageing. Stock value is at current cost, not the lower of cost and net realisable value. Neither is for the accounts.
- Margins are gross margins on current cost. Owners may read them as net profit, so the report and meeting should say "gross".
- Deleting files on request needs to fit with any working-paper retention the accountant's professional rules require. This is already flagged for the lawyer in the agreement draft.

## 4. Test and build status (end of review)

| Check | Result |
|---|---|
| `npm run lint`, `npm run typecheck` | Clean |
| `npm test` (Vitest: unit, accuracy, perf) | 22 files, 275 tests passed |
| `npm run test:e2e` (Playwright) | 31 passed, including the 2 new messy-file uploads |
| `npm run marketing:check` | Copy check passed |
| `npm run agent:check` (n8n build, 26 unit tests, workflow validator) | Passed |
| `npm run build`, `npm run build:offline` | Built |
| `npm audit --omit=dev` | 0 vulnerabilities |

### After the `quick-fixes` branch (items 8, 13, 15, 17)

| Check | Result |
|---|---|
| `npm run lint`, `npm run typecheck` | Clean |
| `npm test` (Vitest) | 25 files, 301 tests passed |
| `npm run test:e2e` (Playwright) | 32 passed, including the new day/month order test |
| `npm run marketing:check` | Copy check passed |
| `npm run agent:check` (n8n build, 30 unit tests, workflow validator against n8n 2.46.6 and 1.123.92) | Passed |
| `npm run build`, `npm run build:offline` | Built |
| `npm audit --omit=dev` | 0 vulnerabilities |
