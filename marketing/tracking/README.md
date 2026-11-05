# Tracking: leads → demos → paid pilots

Two CSV templates. Import both into one Google Sheet (File → Import → Insert new sheet), or open them in Excel. Name the tabs `leads` and `scorecard`.

| File | One row per | Who fills it in |
|---|---|---|
| [`leads.csv`](leads.csv) | Person who contacts us | Whoever answers WhatsApp, the same day |
| [`weekly-scorecard.csv`](weekly-scorecard.csv) | Week × pitch (+ total) | Whoever runs the ads, every Sunday night (and at the ad checkpoints) |

## The decision rule

> **If there are 0 paid pilots after 3 weeks, stop and rethink.**

- **Day 1** is the first day an ad runs or the first post goes out, whichever comes first. Change the dates in the scorecard to match.
- **Paid** means RM300 received, not promised.
- **Stop** means: pause all ad spend and stop posting new offers. Keep answering anyone who already messaged.
- The week 3 *Total* row in the scorecard shows **STOP** or **Continue** automatically (`decision_or_notes` column).
- **No exceptions for good-looking numbers.** Lots of clicks, likes or "interesting!" replies with 0 paid pilots still means stop. Compliments aren't commitments.

### "Rethink" means answering these, in writing, before spending another ringgit

1. **Did people reach a demo?** If not, the problem is the message or the audience: which pitch got the most qualified leads, and what did people say when they didn't book?
2. **Did demos happen but nobody paid?** Then it's the offer. Re-read the notes: was it the price, sharing files (privacy), timing (year-end, CNY), or not seeing enough value in the demo shop?
3. **Did anyone say what they'd pay for instead?** (e.g. only the supplier-invoice check, a lower price, a monthly check, or the accountant visiting the shop.)
4. **Is the accountant's own network a better channel than ads?** (`sales-kit/03-whatsapp-outreach.*`)
5. Record the answer and the next experiment in `docs/DECISIONS.md`.

## Filling in `leads.csv`

Delete the two `EXAMPLE` rows first. Use these values so the summaries work:

| Column | Values |
|---|---|
| `source` | `fb_ad`, `ig_ad`, `fb_post`, `ig_post`, `xhs`, `landing_form`, `landing_whatsapp`, `referral`, `direct_whatsapp`, `other` |
| `ref_code` | Copy it from the first message (e.g. `B-ad-b2-zh`, `A-fb-d07`, `C-xhs`). If there isn't one, ask "where did you see us?" and write the closest match |
| `pitch_variant` | `A` (profit), `B` (stock), `C` (supplier invoices), or `none` (referral, unknown) |
| `ad_or_post_id` | Ad id from `ads/ads.csv` (e.g. `B2-ZH`) or social day (e.g. `day-07`) |
| `stage` | `new` → `qualified` → `demo_booked` → `demo_done` → `pilot_offered` → `pilot_paid`, or `lost` |
| `qualified` | `Y` if they run or manage a retail shop and replied to our first answer |
| `demo_booked`, `demo_done`, `pilot_offered`, `pilot_paid` | `Y` / `N` |
| `lost_reason` | Their words, short (e.g. "too busy till CNY", "won't share supplier invoices", "price") |

**Ref code format:** `<pitch>-<source>`. Landing page links add it to the WhatsApp message automatically (`?v=b&src=fb-d07` → `B-fb-d07`); ads carry it in the prefilled message (`B-ad-b2-zh`); Xiaohongshu leads are `A-xhs` / `B-xhs` / `C-xhs` from the post they mention.

## Filling in `weekly-scorecard.csv`

`spend_rm` comes from Ads Manager. `conversations` comes from Ads Manager ("Messaging conversations started") plus organic messages. Everything else is counted from `leads.csv`. The cost columns and totals are formulas, so fill in only the white cells.

Handy formulas for a summary tab in Google Sheets (assuming the leads tab is called `leads`):

| What | Formula (pitch A; change `"A"` for B, C) |
|---|---|
| Leads | `=COUNTIFS(leads!E:E,"A")` |
| Qualified leads | `=COUNTIFS(leads!E:E,"A",leads!N:N,"Y")` |
| Demos booked | `=COUNTIFS(leads!E:E,"A",leads!O:O,"Y")` |
| Paid pilots | `=COUNTIFS(leads!E:E,"A",leads!S:S,"Y")` |
| Paid pilots, all pitches | `=COUNTIFS(leads!S:S,"Y")` |

## Privacy (PDPA)

`leads.csv` holds names and phone numbers: personal data under Malaysia's PDPA 2010.

- **Don't commit a filled-in copy to this repository** or any public place. Keep the live sheet in a private Google Sheet shared only with the team.
- Only record what you need to follow up. Delete a person's row when they ask, or when they've been `lost` for 6 months.
- Never copy a lead's details into marketing content.
