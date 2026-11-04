# Setup guide (beginner, step by step)

This sets up the Retail Profit Check marketing agent in n8n. **Nothing is posted or sent until you finish step 10** and switch `DRY_RUN` off. Until then everything runs as a safe test.

**Time:** about 1 hour for steps 1–9 (testing with fake data), plus Meta/WhatsApp approval time for going live.

**What you get**

| Workflow file | What it does | When it runs |
|---|---|---|
| `01-content-generator.json` | Writes next week's posts (EN + 中文, 3 pitches) into the sheet as **needs approval** | Fridays 10:00 |
| `02-publisher.json` | Posts rows you set to **approved** to your Facebook Page / Instagram, logs the post IDs | Every hour 07:00–23:00 |
| `03-lead-inbox.json` | When someone messages you on WhatsApp or Messenger: intent + draft reply into the sheet as **needs approval** | When a message arrives |
| `03b-lead-reply-sender.json` | Sends replies you set to **approved**, only within 24 h of their last message | Every 20 min 08:00–23:40 |
| `04-weekly-report.json` | Posts, leads, demos and pilots per pitch, by email and/or Telegram | Mondays 08:00 |

All times are Malaysia time. You approve everything in **one Google Sheet**.

---

## 1. Get n8n

Pick one:

- **n8n Cloud** (easiest): sign up at n8n.io. Every run counts towards your plan's monthly executions. With the default schedules this agent uses about **2,000 executions a month** (publisher ≈ 520, reply sender ≈ 1,450, plus one per inbound message). If your plan is smaller, slow the schedules down (see "Changing how often things run" below).
- **Self-hosted** (free, no execution limit), with Docker:
  ```bash
  docker run -it --rm --name n8n -p 5678:5678 -e GENERIC_TIMEZONE=Asia/Kuala_Lumpur -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
  ```
  Then open http://localhost:5678. **For the WhatsApp and Messenger webhooks, n8n must be reachable from the internet over HTTPS** (a VPS with a domain, or a tunnel). n8n Cloud does this for you. If you install n8n with npm instead of Docker, n8n 2.x needs Node.js 24 or newer.

The workflows were tested on **n8n 2.46.6** and also validated for **n8n 1.123**.

## 2. Make the Google Sheet

1. Create a new Google Sheet, for example "RPC marketing".
2. **File → Settings**: Locale **Malaysia**, Time zone **(GMT+08:00) Kuala Lumpur**. This matters: dates are read day-first.
3. Import the three templates from `marketing-agent/sheet-template/`, one at a time: **File → Import → Upload** → choose the file → **Import location: Insert new sheet(s)** → *Import data*.
   - `posts.csv`, `leads.csv`, `config.csv`
4. Rename the tabs to exactly **posts**, **leads** and **config** (lower case). Delete the empty "Sheet1".
5. Make choosing a status easy (optional but recommended): select column **H** (`status`) in **posts** → **Data → Data validation → Add rule → Dropdown** with: `needs approval, approved, rejected, publishing, posted, posted (dry run), blocked, needs image, error`. Untick "Reject input" is fine. Do the same for **O** (`status`) in **leads** with: `needs approval, approved, sending, sent, sent (dry run), window closed, blocked, error, no message yet, closed`.
6. Copy the **sheet ID**: in the address bar `https://docs.google.com/spreadsheets/d/`**`THIS-LONG-PART`**`/edit`.
7. Keep the sheet **private**. Share it only with the people who approve posts and replies. It will hold names and phone numbers of people who message you.

> Do not rename or reorder the header row (row 1). Adding your own columns to the right is fine.

## 3. Put the brand rules and content brief online

The generator and the lead inbox download `brand-rules.md` and `content-brief.md` every time, so you can edit them without touching n8n.

1. Go to gist.github.com (free GitHub account) → create a **secret gist** with two files, `brand-rules.md` and `content-brief.md`, and paste in the contents of the files in `marketing-agent/`.
2. Click **Raw** on each file and copy the address. Remove the long code between `/raw/` and the file name, so the link always shows the latest version:
   `https://gist.githubusercontent.com/<you>/<gist-id>/raw/brand-rules.md`
3. Open each link in a private browser window: you must see plain text.
4. Paste them into the **config** tab: `BRAND_RULES_URL` and `CONTENT_BRIEF_URL`.

(A "secret" gist is unlisted, not password-protected. That's fine for these two files: they contain nothing private.)

## 4. Import the workflows

For each of the 5 files in `marketing-agent/workflows/`:

1. In n8n: **Workflows → Create workflow** (or "+").
2. Top-right **⋯** menu → **Import from File…** → choose the file.
3. **Save**. Do **not** activate it yet (the toggle stays off).

Each workflow has a yellow note explaining what it does.

## 5. Paste the sheet ID into each workflow

In each of the 5 workflows, open the node **Settings** (second node), replace `PLACEHOLDER_GOOGLE_SHEET_ID` with your sheet ID from step 2, and save. All other settings are in the sheet's **config** tab.

## 6. Create the credentials

After import, nodes that need a login show a warning. Open each one and pick or create the credential below. **Every node with a credential needs one before the workflow can run at all, even in test mode** (n8n checks this before starting). If you won't use a channel (for example Telegram, or Messenger), **delete that node** instead of leaving its placeholder.

| Credential in n8n | Used by | What to enter | For testing with fake data |
|---|---|---|---|
| **Google Sheets OAuth2 API** | all Google Sheets nodes (5 workflows) | n8n Cloud: **Sign in with Google**. Self-hosted: create an OAuth client in Google Cloud (enable the Google Sheets API and Google Drive API) and paste the Client ID/Secret; n8n shows the redirect URL to add | **Needed** (real) |
| **Header Auth** ("LLM API key") | "Call LLM" (1), "Classify with LLM" (3) | Name `Authorization`, Value `Bearer <your API key>` from your LLM provider | Any dummy value, e.g. `Bearer test` |
| **Facebook Graph API** ("Meta Page access token") | Facebook/Instagram posting (2), Messenger replies (3b) | A long-lived **Page access token** (step 7) | Dummy value |
| **Facebook Graph API (App)** | "Messenger Trigger" (3) | App access token (`APP_ID|APP_SECRET`) and **App Secret**. Always fill the App Secret: n8n then rejects fake webhook calls | Dummy values, or delete the node |
| **WhatsApp OAuth API** | "WhatsApp Trigger" (3) | Client ID = Meta **App ID**, Client Secret = **App Secret** | Dummy values |
| **WhatsApp API** | "Send WhatsApp reply" (3b) | Permanent access token + WhatsApp **Business Account ID** | Dummy values |
| **SMTP** | "Send report email" (4) | Your mailbox's SMTP server. Gmail: `smtp.gmail.com`, port 465, SSL on, your address, an **app password** | Real (to receive the test report), or delete the node |
| **Telegram API** | "Send report to Telegram" (4) | Bot token from @BotFather | Real, or delete the node |

In the **Messenger Trigger** node, also replace `PLACEHOLDER_META_APP_ID` with your Meta App ID.

**Never paste a token, password or key into the sheet, a sticky note or a Code node.** Credentials are stored encrypted by n8n.

## 7. Meta setup (Facebook Page, Instagram, WhatsApp) — only for going live

You can skip this until the fake-data tests pass. Meta's screens change often; if a label differs, look for the closest match.

1. **Accounts:** a Facebook **Page** for the business; an Instagram **professional** (business) account linked to the Page (Instagram app → Settings → Business tools → connect a Facebook Page); a **WhatsApp Business** number that is not used in the normal WhatsApp app (or use Meta's *coexistence* option for the WhatsApp Business app).
2. **Meta developer app:** developers.facebook.com → My Apps → Create app → type **Business**. Add the products **WhatsApp**, **Messenger** and **Instagram** (Instagram API with Facebook login).
3. **Page access token** (for posting and Messenger replies): best is a **System User** in Meta Business Settings → Users → System users → add → assign your Page and the app → Generate token with `pages_manage_posts`, `pages_read_engagement`, `pages_messaging`, `instagram_basic`, `instagram_content_publish`, `business_management`. Put it in the **Facebook Graph API** credential.
4. **IDs for the config tab:**
   - `FB_PAGE_ID`: Graph API Explorer → `GET me/accounts` (with your user token) → the Page's `id`.
   - `IG_USER_ID`: Graph API Explorer → `GET {FB_PAGE_ID}?fields=instagram_business_account` → the `id` inside.
   - `WA_PHONE_NUMBER_ID`: App → WhatsApp → **API setup** → "Phone number ID" (not the phone number).
   - `WHATSAPP_NUMBER`: your business WhatsApp number, digits only, with 60 and without the leading 0 (form `601XXXXXXXX`).
   - `GRAPH_API_VERSION`: `v25.0` unless Meta has retired it (developers.facebook.com/docs/graph-api/changelog).
5. **WhatsApp webhook:** activating workflow 3 registers the webhook with Meta automatically (WhatsApp Trigger). Only **one** WhatsApp webhook URL per Meta app is possible. Pressing "Test workflow" on the WhatsApp Trigger temporarily points Meta to n8n's *test* URL, so activate the workflow again afterwards.
6. **Messenger webhook:** activating workflow 3 also subscribes the app to Page messages. Then connect your Page to the app once: App → Messenger → **Messenger API settings → Webhooks → Add/subscribe Page** and tick `messages`, `messaging_postbacks`, `messaging_referrals`. Alternatively, Graph API Explorer: `POST {FB_PAGE_ID}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,messaging_referrals` with the Page token.
7. **Development vs Live mode:** in Development mode Meta only delivers messages from people who have a role on the app (you and your team). That's perfect for testing. To receive messages from the public, switch the app to **Live**; Meta may ask for **App Review** (Advanced Access) for `pages_messaging` and `instagram_content_publish`, and **business verification**. *We could not verify Meta's current review rules from here; follow what the App Dashboard asks for.*

## 8. Fill in the config tab

Open the **config** tab. Each key has a note. For the first tests, keep:

- `DRY_RUN` = `TRUE` (nothing is posted or sent)
- `USE_FAKE_LLM` = `TRUE` (no LLM is called)
- `WHATSAPP_NUMBER` = `60100000001` (a fictional number used by the test files) while testing. Change it to your real business number in step 10. (If it still says `60XXXXXXXXX`, the publisher **blocks** every post because of the placeholder. That is on purpose.)
- `REPORT_CHANNEL`, `REPORT_EMAIL_TO`, `REPORT_EMAIL_FROM` and/or `TELEGRAM_CHAT_ID` (to get a Telegram chat ID: message your bot, then open `https://api.telegram.org/bot<token>/getUpdates` and copy `chat.id`).

For the LLM later: `LLM_BASE_URL` (OpenAI-compatible, ending in `/v1`), `LLM_MODEL`. Examples: OpenAI `https://api.openai.com/v1`; OpenRouter `https://openrouter.ai/api/v1`; DeepSeek `https://api.deepseek.com/v1`; a local Ollama `http://localhost:11434/v1`. If your provider rejects "response_format", set `LLM_JSON_MODE` = `FALSE`.

## 9. Test with fake data

Follow **TEST-PLAN.md, part B** (about 20 minutes). In short:

1. **Generator:** open workflow 1 → **Test workflow**. Six rows appear in **posts** with status **needs approval** and text starting with `[FAKE LLM TEST]`.
2. **Publisher:** in **posts**, set one row's `status` to `approved` and `scheduled_for` to a time in the past (for example today 07:00 as `2026-11-04 07:00`). Open workflow 2 → **Test workflow**. The row becomes **posted (dry run)**.
3. **Lead inbox:** open workflow 3 → open **WhatsApp Trigger** → **Edit output** (pencil) → paste the contents of `fake-data/whatsapp-inbound.json` → Save → hover over the WhatsApp Trigger and click its ▶ **Test workflow** button (this workflow has two triggers). A row appears in **leads** with intent `wants_demo`, pitch `cash_in_stock` and a draft reply.
4. **Reply sender:** set that lead's `status` to `approved` → workflow 3b → **Test workflow** → **sent (dry run)**.
5. **Report:** workflow 4 → **Test workflow** → check your email/Telegram.

Remove pinned test data (**Unpin**) before activating.

## 10. Go live

1. Do step 7 (Meta) and put the real IDs and your real `WHATSAPP_NUMBER` into the **config** tab. Delete the test rows: posts that still contain the fictional number are blocked anyway (rule B9).
2. Replace the dummy credentials with real ones.
3. Set `USE_FAKE_LLM` = `FALSE`, run workflow 1 once by hand, and **read the drafts carefully**: tone, Chinese wording, no banned claims. Delete the `[FAKE LLM TEST]` rows.
4. Set `DRY_RUN` = `FALSE`.
5. **Activate** all five workflows (toggle at the top right of each).
6. Do the live smoke tests in TEST-PLAN.md part C with your own phone and accounts.

**Optional:** in each workflow's **Settings → Error workflow**, choose a small workflow that emails you, so you hear about failures.

## Daily use

- **Posts:** read each **needs approval** row. Edit `text` if you like (what is in the cell is exactly what gets posted). For Instagram, put a public **JPEG** link of a demo screenshot (with the "Demo data" label visible) in `image_url`. Set `status` to `approved`. Rows with `compliance_flags` starting with **BLOCK** will not post until you fix the text. **CHECK** items are reminders.
- **Leads:** read the `last_message` and `draft_reply`, edit the reply if needed, set `status` to `approved` within 24 h of their message. If `status` becomes **window closed**, reply from your phone if it is still suitable, or wait until they write again.
- **After a demo or payment:** type `yes` (or the date) in `demo_booked` / `pilot_paid` on that lead's row. The Monday report counts these per pitch.

## Changing how often things run

Open the trigger node (first node) of the workflow and change the **cron expression** (minute hour day month weekday):

| Workflow | Default | Cheaper alternative |
|---|---|---|
| 2 Publisher | `0 7-23 * * *` (hourly) | `0 9,13,21 * * *` (3 times a day) |
| 3b Reply sender | `*/20 8-23 * * *` | `0 8-23 * * *` (hourly) |

## Privacy housekeeping (PDPA 2010)

- The agent **never** messages anyone who has not written to you first, and never sends bulk or broadcast messages. Don't add that.
- When someone replies STOP, approve the short acknowledgement; after it is sent their number, name and message are removed from the sheet automatically. The row stays (anonymised) for the counts.
- Every few months, delete lead rows older than 12 months that did not become a pilot (or clear their `contact_id`, `contact_name` and `last_message`).
- Workflows 3 and 3b don't keep successful runs in n8n's execution log. Failed runs are kept for debugging; self-hosted users can limit this with `EXECUTIONS_DATA_PRUNE=true` and `EXECUTIONS_DATA_MAX_AGE=336` (hours).
- This guide is practical advice, not legal advice.

## Troubleshooting

| You see | Do this |
|---|---|
| "Node uses the credential PLACEHOLDER…, which you cannot use" | A node still has the imported placeholder credential. Pick a real (or dummy) credential, or delete the node |
| "Fill in X in the config tab" | Put the value for key X in the **config** tab |
| "Drafts for 2026-W46 already exist" | Workflow 1 already ran for that week. Delete those rows to regenerate |
| "Could not download brand-rules.md…" | Open `BRAND_RULES_URL` in a private window; it must show plain text |
| Every post becomes **blocked** with B8 | `WHATSAPP_NUMBER` is still the placeholder |
| **needs image** | Instagram needs `image_url` (public https JPEG) or remove `instagram` from `channels` |
| `error` "(#200) … permission" from Meta | The Page token lacks a permission (step 7.3) or the app is not Live |
| No leads arrive | Is workflow 3 **active**? Did you subscribe the Page (7.6)? In Development mode only app roles can test |
| Dates look wrong | Sheet locale must be **Malaysia** (step 2.2); type dates as `2026-11-09 21:00` |
