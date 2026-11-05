# Facebook & Instagram ads: targeting, RM500 test plan, stop/scale rules

**Goal:** find out which pitch (A profit, B stock, C supplier invoices) gets Penang retail owners to **book a demo** and **pay for a RM300 pilot**, for RM500 in total. Clicks and likes don't count.

- Ad copy: [`ad-copy.md`](ad-copy.md) (30 ads: 5 variants × 3 pitches × EN/中文) and [`ads.csv`](ads.csv)
- Creatives: `marketing/video/clip-*-20s-*.mp4` (9:16) and `marketing/landing/assets/*.webp` / `docs/screenshots/*.png`
- Rules for all copy: [`../BRIEF.md`](../BRIEF.md)
- Log every lead: [`../tracking/leads.csv`](../tracking/leads.csv)

> All thresholds below are **starting assumptions for a very small test, not industry benchmarks.** Write down what actually happens and adjust next time.

## 1. Before you spend anything

1. **WhatsApp Business** on the number that will reply (the accountant's or the team's), linked to the Facebook page. Set a greeting message and quick replies (§6). Replace the placeholder number in the landing page.
2. **Who replies, and when:** someone must reply within **1 hour between 9 am and 10 pm**. Click-to-WhatsApp leads go cold fast.
3. **Facebook page + Instagram account** with at least the first week of posts from `marketing/social/posts.md`, so people who check the page see something real.
4. **Spending limit RM500** in Ads Manager (a campaign spending limit, or an account spending limit). This is the hard cap.
5. **Special ad category:** this is an accounting review service, not credit, insurance or investment. If Ads Manager asks about a special ad category for financial products or services, answer truthfully for the service as it is.

## 2. Campaign setup

| Setting | Choice | Why |
|---|---|---|
| Objective | **Engagement → Conversion location: Messaging apps → WhatsApp** (click-to-WhatsApp) | Owners talk on WhatsApp; one tap from ad to chat |
| Alternative | Traffic → landing page (`?v=…&src=ad-…`) | Use if WhatsApp Business can't be linked yet |
| Budget | **Ad set budgets** (not Advantage campaign budget), **RM20/day per ad set** | Equal spend per pitch keeps the test fair |
| Ad sets | **3: Pitch A, Pitch B, Pitch C**, identical audience | Pitch is the only difference |
| Ads per ad set at start | **4:** variants 1 and 2, each in EN and 中文 | Enough to learn, few enough for RM20/day; variants 3–5 are the bench |
| Prefilled message | Use each ad's `whatsapp_prefill` from `ads.csv` | The ref code (e.g. `B-ad-b2-zh`) arrives with the first message |
| Placements | Advantage+ placements, or manual: Facebook & Instagram Feed, Reels, Stories. **Exclude Audience Network** | Audience Network clicks are mostly accidental |
| Creative format | Reels/Stories: the 9:16 clip. Feed: 4:5 image crop or the clip | Match the placement |

## 3. Targeting (Penang retail owners)

| Setting | Suggestion |
|---|---|
| Location | **Penang** (state), "People living in this location". If reach is too low, add Kulim and Sungai Petani |
| Age | 25–65 |
| Languages | **English (All) and Chinese (All)**: the ads are only in those two languages |
| Detailed targeting (as suggestions, with Advantage+ audience on) | Behaviours: *Small business owners*, *Facebook page admins*. Interests: *Small business*, *Retail*, *Entrepreneurship*, *Wholesale*, *Point of sale*, *Inventory*, *Supermarket*, *Convenience store*. Availability changes; use whichever Ads Manager offers. |
| Exclusions | None at first. From week 2, exclude people who already messaged (custom audience of WhatsApp conversations) |
| Retargeting (optional, from the RM80 reserve) | Page/IG engagers in the last 30 days + people who watched 50% of a `clip-*` video → show the variant 5 ad (offer and process) of the winning pitch |

The creative does most of the targeting: a Penang minimart screenshot, "RM", "supplier invoice" and "stock" select for shop owners better than interest boxes.

## 4. RM500 test budget plan

| Phase | Days | Budget | What runs |
|---|---|---:|---|
| **Test** | 1–7 | RM20/day × 3 pitches × 7 days = **RM420** | All three ad sets, 4 ads each |
| **Focus** | 8–11 | RM20/day × 4 days = **RM80** | Only the winning pitch (or winner + retargeting) |
| **Total** | | **RM500** | |

**Check daily at 10 pm. Make decisions only at the checkpoints** (days 3, 7 and 11), because one day of data on RM20 is noise.

### Definitions (count from the tracking sheet, not only Ads Manager)

- **Conversation:** someone sends the first WhatsApp message (Ads Manager: "Messaging conversations started").
- **Qualified lead:** the person runs or manages a retail shop and replies to our first answer.
- **Demo booked:** a date and time agreed for the 5-minute demo.
- **Paid pilot:** RM300 received.

### Stop rules

| Level | When | Rule |
|---|---|---|
| Ad | Any day, once the ad has spent **RM15** | 0 conversations **and** link click-through rate under 0.5% → pause it and swap in the next bench variant (3, 4, 5) in the same language |
| Pitch (ad set) | Day 3 checkpoint (~RM60 spent) | 0 conversations and below 0.5% CTR on every ad → swap all ads to bench variants. Don't stop the pitch yet. |
| Pitch (ad set) | Once it has spent **RM100** | 0 qualified leads → **pause the pitch** |
| Pitch (ad set) | Once it has spent **RM100** | Cost per conversation over **RM40** while another pitch is under RM20 → pause it |
| Creative fatigue | Any time | Frequency over 3.5 in 7 days and CTR falling → swap creative (Penang is a small audience) |
| Whole test | Day 11 (RM500 spent) | **0 qualified leads in total → stop ads.** The message or the audience is wrong, not the budget. Rethink before spending more. |

### Pick the winner (day 7)

1. Most **demos booked** per RM spent.
2. Tie, or no demos yet → lowest **cost per qualified lead**.
3. Still tied → lowest cost per conversation.

The winner gets the RM80 focus budget; pause the others. Inside the winner, keep the two best ads (one EN, one 中文).

### Scale rules (spending beyond RM500)

Only scale if **both** are true:

- the pitch has booked **at least 1 demo at RM150 or less per booked demo**, and
- **at least 1 paid RM300 pilot** can be traced to an ad ref code (or is clearly expected after a demo).

Then add the next **RM500** to that pitch only, raising daily budget by **at most 20% every 3 days** (bigger jumps reset Meta's learning), and keep the same stop rules. A RM500 test that brings one RM300 pilot is not break-even. It buys evidence, which is the point at this stage.

**The overriding rule** (from the tracking sheet): **if there are 0 paid pilots after 3 weeks, stop all spend and rethink** the offer, the price or the audience, whatever the click numbers say.

## 5. What to record

At each checkpoint, add one line per pitch to `../tracking/weekly-scorecard.csv` (spend, conversations, qualified leads, demos, pilots). Log each person in `../tracking/leads.csv` with their **ref code**, so pitch and ad variant can be tied to demos and payments without any tracking pixel.

## 6. First replies (WhatsApp quick replies)

Reply as a person, not a bot. Fill in the names; keep it short.

**EN:**
> Hi, thanks for messaging! I'm [NAME], working with [ACCOUNTANT NAME] (ACCA, Penang). Happy to show you the 5-minute demo on our fictional demo shop, by video call or in person. What kind of shop do you run, and roughly how many outlets?

**中文：**
> 你好，谢谢你的信息！我是 [NAME]，跟 [ACCOUNTANT NAME]（ACCA 会计师，槟城）一起做的。可以用虚构的示范店给你看 5 分钟演示，视频或见面都可以。请问你开的是什么店？大概几间分店？

**Greeting message** (WhatsApp Business → Business tools → Greeting message), sent automatically to new contacts:

**EN:**
> Hi, thanks for messaging Retail Profit Check! We'll reply soon (9 am–10 pm). Our replies may be drafted with an AI writing tool and are checked by a person before they are sent. Reply STOP anytime.

**中文：**
> 你好，谢谢你联系 Retail Profit Check！我们很快会回复（早上 9 点到晚上 10 点）。我们的回复可能先用 AI 写作工具起草，再由真人检查后才发出。随时回 STOP 就不再联系你。

**After they answer:** offer two time slots for the demo. Then use `sales-kit/DEMO_SCRIPT*.md`, `sales-kit/04-objection-handling.*` and, for the pilot ask, `sales-kit/03-whatsapp-outreach.*` message 5. Never quote a monthly price as fixed; it's still being tested.
