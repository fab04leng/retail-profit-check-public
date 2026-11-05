# Test plan — marketing agent

Four layers, from cheapest to most real:

| Part | What | Where | Needs |
|---|---|---|---|
| A | Automated checks: unit tests, workflow validator, runtime test in a real n8n | this repo | Node.js (24+ for the runtime test) |
| B | Manual tests with **fake data** in your own n8n (`DRY_RUN` and `USE_FAKE_LLM` on) | your n8n + Google Sheet | Google Sheets credential only |
| C | Live smoke tests with **your own** accounts and phone | your n8n, Meta, LLM | Step 7 and 10 of SETUP.md done |
| D | Brand-rule spot checks | any | — |

Pass criteria for go-live: **A all green, B all expected results, C1–C8 done once.**

---

## A. Automated checks (repo)

Run from the repo root.

| # | Command | What it proves |
|---|---|---|
| A1 | `npm run agent:test` | 26 unit tests of the logic inside the Code nodes: banned claims and allowed disclaimers (EN/中文/BM), Malaysia-time weeks and date parsing, pitch rotation and attribution, config parsing, LLM JSON parsing, post rows, publish picking, webhook normalising, duplicates, opt-outs, the 24 h window, reply caps, data scrubbing, report counts |
| A2 | `npm run agent:schema` (once) then `npm run agent:validate` | Every workflow JSON parses and is well-formed; node types and versions exist in **n8n 2.46.6** (current) and **1.123.92** (last 1.x); every parameter is one n8n would keep; option values valid; required parameters set; credential types exist and are placeholders; all `$('Node')` references exist; Code nodes compile; no secrets or real contact details in `marketing-agent/`. Writes `VALIDATION.md` |
| A3 | `N8N_BIN=<path>/node_modules/.bin/n8n npm run agent:runtime` | Imports all workflows into a temporary **real n8n** and runs 19 scenarios (below). Google Sheets/WhatsApp/Telegram/email nodes are replaced by Code nodes with the same name; HTTP Request nodes (LLM, Meta Graph API, file downloads) stay real and talk to a local mock server whose received requests are checked |

To get an n8n for A3 without touching your main install: `npm install n8n@2.46.6` in an empty folder (Node.js 24+), then point `N8N_BIN` at `node_modules/.bin/n8n`. If you installed under an older Node, run `npm rebuild isolated-vm sqlite3` with Node 24.

### Runtime scenarios (A3)

| ID | Scenario | Expected |
|---|---|---|
| 1a | Generator, fake LLM | 6 rows, all `needs approval`, 3 pitches, 3 Chinese, CTA with tracking code; real LLM not called; placeholder download URL fails softly |
| 1b | Generator run twice for the same week | Stops with "already exist"; nothing saved |
| 1c | Generator, real LLM path (mock) | Request has the model, JSON mode, brand rules and brief in the prompt; "fraud" draft flagged `BLOCK B1` but still only a draft |
| 2a | Publisher dry run | Due approved row → `posted (dry run)`; fraud → `blocked`; Instagram without image → `needs image`; future and unapproved rows untouched; nothing sent to Meta |
| 2b | Publisher live (mock Meta) | `/photos` and Instagram container + `media_publish` called with the right bodies; Facebook and Instagram IDs logged; `posted` |
| 2c | Instagram fails after Facebook succeeded | `error` "Partly posted", Facebook ID kept, not retried |
| 2d | Text-only Facebook post | `/feed` called, ID logged |
| 2e | Live run with `FB_PAGE_ID` missing | Stops before marking or posting, error names the key |
| 3a | New WhatsApp lead (fake LLM) | One `needs approval` row: `wants_demo`, `cash_in_stock`, privacy line in the draft, manual columns untouched |
| 3b | Same WhatsApp message delivered twice | Nothing saved the second time |
| 3c | "STOP" | `do_not_contact = yes`, `not_interested`, no LLM call |
| 3d | Messenger + real LLM (mock) | Page echo ignored; message passed between markers; system prompt says customer text is untrusted; brand-rules-missing warning |
| 3e | LLM returns 500 | Lead still saved, empty draft, "LLM failed" flag |
| 3f | Reply sender dry run | Inside 24 h → `sent (dry run)`; 30 h old → `window closed`; `do_not_contact` → `blocked`; "save tax" → `blocked`; unapproved untouched; nothing sent |
| 3g | Reply sender live (mock) | WhatsApp and Messenger replies sent (Messenger body: recipient, `RESPONSE`, text); opt-out acknowledgement sent and number/name/message replaced by `[deleted on request]` |
| 3h | WhatsApp API error | `error` with Meta's message |
| 4a | Weekly report, both channels | Correct counts per pitch, "waiting for you" list, HTML table |
| 4b | Telegram without chat ID | Clear error naming `TELEGRAM_CHAT_ID`; nothing sent |
| 4c | Email only | Only the email node runs |

**Result in this branch (n8n 2.46.6, Node.js 24.22, 2026-11-04):** A1 26/26 pass · A2 0 errors, 0 warnings on 2.46.6 and 1.123.92 · A3 19/19 pass.

**Not covered by A:** the real Google Sheets, WhatsApp, Telegram and SMTP nodes (only their parameters are validated), real Meta and LLM behaviour, the n8n editor UI. That is what parts B and C are for.

---

## B. Manual tests with fake data (your n8n)

Setup: SETUP.md steps 1–6 and 8, with `DRY_RUN = TRUE`, `USE_FAKE_LLM = TRUE` and `WHATSAPP_NUMBER = 60100000001` (the fictional number in the test files; `fake-data/config-test.csv` has these values). Dummy credentials are fine except Google Sheets (and SMTP/Telegram if you want to receive the report). Everything below is safe: nothing leaves n8n except writes to your sheet and the report to yourself.

Test files are in `marketing-agent/fake-data/`. All names and numbers in them are invented (`6010000000x`).

| # | Steps | Expected result |
|---|---|---|
| B1 | Workflow 1 → **Test workflow** | 6 new rows in **posts**: `needs approval`, `[FAKE LLM TEST]` text, a `wa.me/<your number>?text=PROFIT/STOCK/INVOICE` link, `scheduled_for` next Mon/Wed/Fri 21:00, Chinese rows in casual Malaysian Chinese |
| B2 | Run workflow 1 again | Fails with "Drafts for … already exist". No new rows |
| B3 | Paste `fake-data/posts-test.csv` rows (without the header) into **posts**. Make sure their `scheduled_for` is in the past. Workflow 2 → **Test workflow** | `2026-W45-1-en` → `posted (dry run)` with `dry-run-fb-…` in `fb_post_id`. Run again: `2026-W45-2-en` → `blocked` ("fraud", B1); `2026-W45-3-en` → `needs image`; `2026-W45-1-zh` (needs approval) unchanged |
| B4 | Change one approved row's text to include "save tax", set it to `approved`, run workflow 2 | `blocked` with `BLOCK B3` in `compliance_flags` |
| B5 | Workflow 3 → **WhatsApp Trigger** → *Edit output* → paste `fake-data/whatsapp-inbound.json` → Save. Hover over the WhatsApp Trigger and click its ▶ **Test workflow** button (workflow 3 has two triggers) | New row in **leads**: source `whatsapp`, contact `60100000004`, intent `wants_demo`, pitch `cash_in_stock`, draft with the privacy line, status `needs approval` |
| B6 | Run B5 again (same pinned data) | No new row, row unchanged (duplicate delivery ignored) |
| B7 | Pin `fake-data/whatsapp-inbound-stop.json` instead, run | Row with `do_not_contact = yes`, intent `not_interested`, polite acknowledgement as draft |
| B8 | Pin `fake-data/whatsapp-inbound-zh-question.json`, run | `language = zh`, pitch `supplier_invoice`, intent `question`, Chinese draft |
| B9 | **Messenger Trigger** → *Edit output* → paste `fake-data/messenger-inbound.json` → Save → hover over the Messenger Trigger and click its ▶ **Test workflow** button | One row (the Page echo is ignored), source `messenger`, intent `not_interested` |
| B10 | Paste `fake-data/leads-test.csv` rows into **leads**. Set `last_inbound_at` of `L-TEST0001` to one hour ago. Workflow 3b → **Test workflow** | `L-TEST0001` → `sent (dry run)`; `L-TEST0002` (October) → `window closed`; `L-TEST0003` (already sent) untouched |
| B11 | Approve the STOP row from B7 and run 3b | `sent (dry run)`. (In dry run the contact data is kept; live, it is replaced by `[deleted on request]`) |
| B12 | Workflow 4 → **Test workflow** | Report arrives; per-pitch numbers match what you see in the sheet (count by hand once) |
| B13 | Set `WHATSAPP_NUMBER` back to `60XXXXXXXXX`, approve a post, run workflow 2 | `blocked` with `BLOCK B8` (placeholder) |

Afterwards: unpin trigger data, delete the test rows (or keep them in a copy of the sheet).

---

## C. Live smoke tests (your own accounts only)

Do these once after going live (SETUP.md step 10), using **your own** phone, Facebook account and Page. Don't test on real customers.

| # | Steps | Expected result |
|---|---|---|
| C1 | `USE_FAKE_LLM = FALSE`, run workflow 1 by hand | 6 drafts. Read every one: plain tone; Chinese reads like a Malaysian talking (not a translation, no Mainland slang); no banned claims; any RM figure says demo data. Note anything off in `reviewer_notes` and improve `brand-rules.md` |
| C2 | Approve one **Facebook-only** text post scheduled in the past; wait for the next full hour (or **Test workflow**) | Post appears on the Page; `fb_post_id` filled; status `posted` |
| C3 | Approve a post with `channels = facebook,instagram` and a public JPEG demo screenshot in `image_url` | Photo post on the Page and on Instagram; both IDs filled |
| C4 | From **your own phone**, send "STOCK" to the business WhatsApp number | Within seconds a lead row: source `whatsapp`, pitch `cash_in_stock`, draft reply |
| C5 | Approve that draft | Within 20 minutes the reply arrives on your phone; status `sent`; `reply_message_id` filled |
| C6 | From your personal Facebook account, message the Page (or open `m.me/<page>?ref=INVOICE`) | Lead row with source `messenger`; after approval the reply arrives in Messenger |
| C7 | Send "STOP" from your phone; approve the acknowledgement | One acknowledgement arrives; the row's number and message become `[deleted on request]` |
| C8 | Wait until Monday 08:00 (or run workflow 4 by hand) | Report with your test post and leads in the right pitch rows |
| C9 | Approve a reply for a lead whose last message was more than 24 h ago | `window closed`; nothing sent |

Then delete the test posts from the Page/Instagram if you like, and mark the test leads (`notes: test`) or delete them.

---

## D. Brand-rule spot checks

Paste each sentence into an approved post (or a lead's `draft_reply`) and run the publisher (or reply sender) in dry run. The same cases are in the unit tests.

| Text | Expected |
|---|---|
| "Catch supplier fraud early" / "员工偷货" | `blocked` B1 |
| "This replaces your accountant" / "不需要会计" | `blocked` B2 |
| "Save tax this year" / "教你省税" / "LHDN e-invoicing ready" | `blocked` B3 |
| "This is an analysis aid, not tax advice." / "这不是税务建议。" | allowed |
| "Guaranteed savings" / "我们保证…" | `blocked` B4 |
| "We can't guarantee any particular saving." | allowed |
| "Our AI-powered profit check" | `blocked` B5 ("No AI guessing" is allowed) |
| "Get audited accounts" | `blocked` B6 |
| "We found RM4,200 of dead stock" (no demo label) | allowed, but `CHECK W1` on the draft |

---

## E. Known gaps and uncertainties

- **Meta App Review and permissions** change over time and could not be verified from here. In Development mode only people with a role on the app can test messaging (SETUP step 7.7).
- **Facebook Trigger fields:** n8n's editor list for the Page object does not show `messages`; the JSON sets them and the node passes them to Meta unchanged (checked in n8n's source). If Meta rejects the subscription on activation, subscribe the Page manually (SETUP step 7.6).
- **Instagram processing time:** the publisher waits 20 seconds between creating and publishing the media. Very large images may need longer; the row then shows `error` and can be approved again.
- **Google Sheets node behaviour** (append/update/read) is validated for parameters but only exercised for real in part B.
- **The LLM's Chinese:** quality depends on the model. Part C1 is a human check; the brand-rule code checks claims, not style.
- **US-locale sheets** would show month-first dates; the sheet must use the Malaysia locale (SETUP step 2.2).
