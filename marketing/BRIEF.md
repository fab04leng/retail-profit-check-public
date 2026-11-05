# Marketing brief: Retail Profit Check

**Read this before writing any copy.** It is the source of truth for the AI marketing agent and anyone else producing ads, posts or replies. If something here conflicts with a draft, this file wins. Run `npm run marketing:check` on anything new.

## 1. What we sell

A **one-off RM300 pilot**: we run an owner's own sales, stock and supplier-invoice exports through readable checks, an **ACCA-qualified accountant in Penang** reviews every finding, and the owner gets a 45–60 minute results meeting and a written report, about 2 weeks after we receive the files.

**Goal of all marketing:** booked demos (a 5-minute walkthrough on the fictional demo shop), then paid RM300 pilots. Likes and followers don't count.

## 2. Who it's for

Owners of independent retail shops in Penang (later the rest of Malaysia): minimarts, convenience and sundry shops, pharmacies with retail, hardware, pet, baby, gift and lifestyle stores, mall shops, hotel retail. 1–5 outlets. Uses a POS that can export to Excel/CSV. Bilingual: English and Chinese (many prefer Chinese with English words such as "stock", "invoice", "cash flow").

## 3. Positioning

**"Accountant-checked", never "AI".** The face is a real, ACCA-qualified accountant in Penang (name and photo to be added with consent; until then use `[ACCOUNTANT NAME]`). The software does the routine checking, and a person checks the results.

Three pitches, rotated and tested:

| Code | Pitch | One line (EN) | One line (中文) |
|---|---|---|---|
| A | Real profit by product | See your real profit, product by product. | 每样货到底赚多少，一次看清楚。 |
| B | Cash stuck in stock | How much of your cash is sitting on the shelf? | 你有多少现金，正压在货架上？ |
| C | Supplier invoice mistakes | Catch costly supplier invoice mistakes. | 供应商发票出错，你抓得到吗？ |

## 4. Facts you may use

- Checks: products sold below cost; margin under a target (default 25%); stock value by days since last sale; possible dead stock (no sale 90+ days); days of stock cover; possible duplicate supplier invoices (same number, or same amount within 7 days); supplier price rises above 5%; invoices possibly paid twice or overpaid; payments with no matching invoice; an 8-week cash-flow **estimate**.
- Every finding shows the exact rows from the owner's own files, with row numbers.
- Rules are plain English; thresholds can be changed.
- Each finding is marked *Confirmed*, *Not an issue* or *Needs info* by the accountant.
- Files needed: sales export, product/stock list with unit cost, supplier invoice list; payments optional. Excel or CSV, 3–12 months. English, Malay or Chinese column names.
- Privacy: the demo app runs in the browser with no upload and no AI service. Pilot files are kept on an encrypted laptop, used only for the pilot, seen only by the small team and the reviewing accountant, never shared or sold, and deleted on request with written confirmation. Owners can remove customer names/phones first. PDPA 2010.
- After the pilot: no obligation. A monthly service is **being tested** (roughly RM300–RM800/month by outlets). Never quote it as a fixed price.

## 5. Demo numbers (fictional shop "Pinangria Mart")

You may quote these **only with a "demo data" / "示范资料" label in the same post, ad, caption or frame**, and never as a customer's result or a typical result.

| Headline (demo data) | Figure |
|---|---|
| Cash tied up in slow stock (31 products, no sale > 60 days, at cost) | RM 9,392.62 |
| …of which possible dead stock (25 products, > 90 days) | RM 8,872.66 |
| Sold below cost (10 products, 12 months) | RM 3,130.27 |
| Possible duplicate supplier invoices (6) | RM 4,783.20 |
| Possible overpayments to suppliers (2 invoices) | RM 8,410.86 |
| Lowest cash week in the next 8 weeks (week of 16 Nov), **an estimate** | −RM 4,148.77 |
| Biggest single dead-stock item: leftover large CNY hampers (27 units) | RM 2,922.75 |
| Example below-cost product: supplier cost up 15%, shelf price unchanged | RM 759.78 |

**Images too:** the crops in `landing/assets/` carry a "Demo data · fictional shop" badge. A crop you make from `docs/screenshots/` must keep the app's yellow "Demo data" banner or get the same badge.

Good: *"In our demo shop (fictional data), the check flagged RM 4,783.20 in possible duplicate invoices."*
Bad: *"Shops lose RM 4,783 to duplicate invoices."* / *"A Penang minimart found RM 9,392."* <!-- copy-check: ignore -->

## 6. Never say

- Anything with **AI** as the selling point ("AI-powered", "our AI finds…"). If asked, the answer is: *no, it's readable rules plus an accountant's review.* <!-- copy-check: ignore -->
- **Fraud, scams, cheating staff or suppliers.** We find *possible mistakes* such as duplicates, overpayments and price changes. We never accuse anyone. <!-- copy-check: ignore -->
- That it **replaces an accountant**, produces **audited accounts**, or gives **tax advice** (saying it does *not* is fine). <!-- copy-check: ignore -->
- **Savings promises** or guarantees: "save RM X", "pays for itself", "guaranteed", "you're losing RM X". <!-- copy-check: ignore -->
- Absolutes: "catches every mistake", "100% accurate". <!-- copy-check: ignore -->
- Real shop names, real people (other than the accountant, once they consent), customer quotes or testimonials. **We have none yet; don't invent any.**
- Fake urgency ("only 2 slots left!") unless it's literally true that day.

Use "possible", "may", "needs review", "estimate", "flag". Write in short sentences and use RM, not "$".

## 7. Voice

Plain, warm and practical. It should sound like a sensible accountant friend at the kopitiam, not a software company. For Chinese, write casual Malaysian Chinese (马来西亚华语): 老板、货、stock、invoice、cash flow、拿货、清货、死货、对数, light 啦/哦/咯 in social posts (never in an ad's first line). No mainland-only slang.

## 8. Channels and calls to action

| Channel | Call to action | Notes |
|---|---|---|
| Facebook / Instagram ads | **Click-to-WhatsApp** ("Send WhatsApp message"), or link to landing `?v=a\|b\|c&src=fbad\|igad&lang=en\|zh` | The prefilled message includes the ref code. |
| Facebook / Instagram posts | "WhatsApp us" (link in bio / page button) | Pin a post explaining the RM300 pilot. |
| Xiaohongshu (小红书) | "私信我们" / "评论区留言" | **Don't put phone numbers, WhatsApp links or URLs in XHS posts or comments**: the platform restricts off-platform contact and may throttle or remove the post. Move people to WhatsApp only in DMs, and only when they ask. |
| WhatsApp replies | Offer the 5-minute demo first, then the pilot | Use `sales-kit/03-whatsapp-outreach.*` and `04-objection-handling.*`. |

**Attribution without trackers:** every link and prefilled message carries a ref code `<pitch>-<source>` (e.g. `B-fbad`). Log it in `tracking/leads.csv` when the first message arrives.

## 9. Approval

Anything that shows the accountant's name, face or voice must be approved by the accountant before it's posted. Anything with a number must be checked against section 5.
