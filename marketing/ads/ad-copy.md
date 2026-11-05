# Facebook & Instagram ad copy

Generated from `marketing/scripts/ads-data.mjs` by `npm run marketing:ads`. **Edit the data file, not this file.** The same ads are in [`ads.csv`](ads.csv). Targeting, the RM500 test budget and the stop/scale rules are in [`README.md`](README.md).

- **5 variants per pitch × EN + 中文 = 30 ads.** Angles: 1 question hook · 2 demo-data example · 3 accountant/trust · 4 timely or practical · 5 offer and process.
- **Destination:** click-to-WhatsApp (button "Send WhatsApp message") with the prefilled message below, so the ref code arrives with the first message. If you use the landing page instead, use the landing URL (same ref code).
- **Every figure is from the fictional demo shop and says so in the ad.** Never imply anything about the viewer's finances (Meta "personal attributes" policy): no "Is your shop losing money?".
- Keep the first ~125 characters of the primary text strong; that's what shows before "See more".

## Pitch A · See your real profit by product

### A1 · Question hook

**Creative:** clip-a-profit-20s (9:16) for Reels/Stories; en-profit.webp / zh-profit.webp (4:5 crop) for Feed

| | English | 中文 |
|---|---|---|
| **Primary text** | Which products actually make money, and which sell below cost? It's easy to miss when supplier prices change. We check your own sales and stock exports, and an ACCA-qualified accountant in Penang reviews every finding. | 哪样货真的赚钱？哪样其实低于成本在卖？供应商一涨价就很容易漏掉。我们用你店里自己的销售和库存资料检查，每一项都由槟城的 ACCA 会计师复核。 |
| **Headline** | See your real profit by product | 每样货赚多少，一次看清 |
| **Description** | Accountant-checked · RM300 pilot | 会计师复核 · RM300 试点 |
| **Button** | Send WhatsApp message | Send WhatsApp message |
| **WhatsApp prefill** | Hi! I saw your ad (ref A-ad-a1-en). I'd like the 5-minute demo. | 你好！我看到你们的广告（ref A-ad-a1-zh），想看 5 分钟演示。 |
| **Landing URL** | `https://<your-landing-page>/?v=a&lang=en&src=ad-a1-en` | `https://<your-landing-page>/?v=a&lang=zh&src=ad-a1-zh` |

### A2 · Demo-data example

**Creative:** en-profit.webp / zh-profit.webp (below-cost findings, demo label visible)

| | English | 中文 |
|---|---|---|
| **Primary text** | In our demo shop (fictional data), 10 products were selling below cost: RM 3,130.27 over a year, some because supplier price rises never reached the shelf price. Want to see what a check of your own shop shows? | 在我们的示范店（虚构资料）里，有 10 种货低于成本在卖，一年少卖了 RM 3,130.27，其中有些是供应商涨价后卖价没跟着调。想知道你的店检查出来会怎样吗？ |
| **Headline** | Products sold below cost? | 有货低于成本在卖吗？ |
| **Description** | Demo data · accountant-checked | 示范资料 · 会计师复核 |
| **Button** | Send WhatsApp message | Send WhatsApp message |
| **WhatsApp prefill** | Hi! I saw your ad (ref A-ad-a2-en). I'd like the 5-minute demo. | 你好！我看到你们的广告（ref A-ad-a2-zh），想看 5 分钟演示。 |
| **Landing URL** | `https://<your-landing-page>/?v=a&lang=en&src=ad-a2-en` | `https://<your-landing-page>/?v=a&lang=zh&src=ad-a2-zh` |

### A3 · Accountant / trust

**Creative:** docs/screenshots/09-rules.png (rules in plain English) or the accountant photo (with consent)

| | English | 中文 |
|---|---|---|
| **Primary text** | No black box. Readable rules, every finding linked to the rows in your own files, and an ACCA-qualified accountant who reviews it all with you. | 不是黑箱。看得懂的规则、每项发现都对得上你文件里的原始行，再由 ACCA 会计师跟你一起过一遍。 |
| **Headline** | Accountant-checked profit check | 会计师复核的利润检查 |
| **Description** | Penang · RM300 one-off | 槟城 · 一次性 RM300 |
| **Button** | Send WhatsApp message | Send WhatsApp message |
| **WhatsApp prefill** | Hi! I saw your ad (ref A-ad-a3-en). I'd like the 5-minute demo. | 你好！我看到你们的广告（ref A-ad-a3-zh），想看 5 分钟演示。 |
| **Landing URL** | `https://<your-landing-page>/?v=a&lang=en&src=ad-a3-en` | `https://<your-landing-page>/?v=a&lang=zh&src=ad-a3-zh` |

### A4 · Timely or practical

**Creative:** Text card: "Profit by product in about 2 weeks" over docs/screenshots/03-profit.png

| | English | 中文 |
|---|---|---|
| **Primary text** | Send 3–12 months of POS and stock exports. In about 2 weeks, sit down with an accountant and see profit and margin for every product. RM300, one-off. | 提供 3–12 个月的 POS 和库存报表，大约 2 个星期后，跟会计师坐下来看每样货的利润和毛利。一次性 RM300。 |
| **Headline** | Profit by product in ~2 weeks | 约 2 周看清每样货利润 |
| **Description** | No obligation to continue | 没有义务继续 |
| **Button** | Send WhatsApp message | Send WhatsApp message |
| **WhatsApp prefill** | Hi! I saw your ad (ref A-ad-a4-en). I'd like the 5-minute demo. | 你好！我看到你们的广告（ref A-ad-a4-zh），想看 5 分钟演示。 |
| **Landing URL** | `https://<your-landing-page>/?v=a&lang=en&src=ad-a4-en` | `https://<your-landing-page>/?v=a&lang=zh&src=ad-a4-zh` |

### A5 · Offer and process

**Creative:** docs/screenshots/03-profit.png (crop: "Margin below target (25.0%)")

| | English | 中文 |
|---|---|---|
| **Primary text** | Target margin 25%? See which products fall below it, and decide whether that's on purpose. Product by product, checked by an accountant. | 目标毛利 25%？看看哪些货低过这个数，再决定是不是故意的。一样一样看清楚，会计师复核。 |
| **Headline** | Which products miss your margin? | 哪些货毛利不够？ |
| **Description** | Accountant-checked | 会计师复核 |
| **Button** | Send WhatsApp message | Send WhatsApp message |
| **WhatsApp prefill** | Hi! I saw your ad (ref A-ad-a5-en). I'd like the 5-minute demo. | 你好！我看到你们的广告（ref A-ad-a5-zh），想看 5 分钟演示。 |
| **Landing URL** | `https://<your-landing-page>/?v=a&lang=en&src=ad-a5-en` | `https://<your-landing-page>/?v=a&lang=zh&src=ad-a5-zh` |

## Pitch B · Free up cash stuck in stock

### B1 · Question hook

**Creative:** clip-b-stock-20s (9:16) for Reels/Stories; en-stock.webp / zh-stock.webp for Feed

| | English | 中文 |
|---|---|---|
| **Primary text** | How much cash is sitting on the shelf? See stock value by days since last sale, and which items haven't sold in 90+ days. Reviewed by an ACCA-qualified accountant in Penang. | 货架上压了多少现金？按多久没卖出看库存金额，找出超过 90 天没卖的货。由槟城的 ACCA 会计师复核。 |
| **Headline** | Find cash stuck in stock | 找出压在货里的钱 |
| **Description** | Accountant-checked · RM300 pilot | 会计师复核 · RM300 试点 |
| **Button** | Send WhatsApp message | Send WhatsApp message |
| **WhatsApp prefill** | Hi! I saw your ad (ref B-ad-b1-en). I'd like the 5-minute demo. | 你好！我看到你们的广告（ref B-ad-b1-zh），想看 5 分钟演示。 |
| **Landing URL** | `https://<your-landing-page>/?v=b&lang=en&src=ad-b1-en` | `https://<your-landing-page>/?v=b&lang=zh&src=ad-b1-zh` |

### B2 · Demo-data example

**Creative:** en-stock.webp / zh-stock.webp (hamper dead-stock finding, demo label visible)

| | English | 中文 |
|---|---|---|
| **Primary text** | Demo shop (fictional data): RM 9,392.62 in stock with no sale for 60+ days, including 27 leftover CNY hampers. What's on your shelves? | 示范店（虚构资料）：RM 9,392.62 的货超过 60 天没卖出，包括 27 个过了年剩下的礼篮。你的货架上有什么？ |
| **Headline** | Stock that stopped selling | 卖不动的货压了多少？ |
| **Description** | Demo data · accountant-checked | 示范资料 · 会计师复核 |
| **Button** | Send WhatsApp message | Send WhatsApp message |
| **WhatsApp prefill** | Hi! I saw your ad (ref B-ad-b2-en). I'd like the 5-minute demo. | 你好！我看到你们的广告（ref B-ad-b2-zh），想看 5 分钟演示。 |
| **Landing URL** | `https://<your-landing-page>/?v=b&lang=en&src=ad-b2-en` | `https://<your-landing-page>/?v=b&lang=zh&src=ad-b2-zh` |

### B3 · Accountant / trust

**Creative:** Carousel: CNY ordering checklist cards (see social day 29)

| | English | 中文 |
|---|---|---|
| **Primary text** | Ordering for Chinese New Year soon? First check what's left from last year and how many days of stock you already have. We work it out from your own exports. | 快要拿农历新年的货了？先看看去年剩多少、现在的货还够卖几天。我们用你自己的报表算给你看。 |
| **Headline** | Check stock before CNY orders | 拿年货前先看库存 |
| **Description** | Accountant-checked | 会计师复核 |
| **Button** | Send WhatsApp message | Send WhatsApp message |
| **WhatsApp prefill** | Hi! I saw your ad (ref B-ad-b3-en). I'd like the 5-minute demo. | 你好！我看到你们的广告（ref B-ad-b3-zh），想看 5 分钟演示。 |
| **Landing URL** | `https://<your-landing-page>/?v=b&lang=en&src=ad-b3-en` | `https://<your-landing-page>/?v=b&lang=zh&src=ad-b3-zh` |

### B4 · Timely or practical

**Creative:** docs/screenshots/phone-stock.png in a phone frame

| | English | 中文 |
|---|---|---|
| **Primary text** | Planning a year-end clearance? Know which items have really stopped selling, and what they cost you, before you mark them down. | 准备年底清货？先知道哪些货真的不动了、压了多少成本，再决定怎么减价。 |
| **Headline** | Clear the right stock | 清货先清对的货 |
| **Description** | Accountant-checked · RM300 | 会计师复核 · RM300 |
| **Button** | Send WhatsApp message | Send WhatsApp message |
| **WhatsApp prefill** | Hi! I saw your ad (ref B-ad-b4-en). I'd like the 5-minute demo. | 你好！我看到你们的广告（ref B-ad-b4-zh），想看 5 分钟演示。 |
| **Landing URL** | `https://<your-landing-page>/?v=b&lang=en&src=ad-b4-en` | `https://<your-landing-page>/?v=b&lang=zh&src=ad-b4-zh` |

### B5 · Offer and process

**Creative:** Text card: "Your slow-stock list, checked by an accountant" + en-stock.webp

| | English | 中文 |
|---|---|---|
| **Primary text** | Send your sales and stock exports. Get a list of slow and possibly dead stock, valued at cost, reviewed by an ACCA-qualified accountant. RM300 one-off pilot. | 提供销售和库存报表，拿到一份按成本计的滞销货和可能死货清单，由 ACCA 会计师复核。一次性 RM300 试点。 |
| **Headline** | Your slow-stock list, checked | 滞销货清单，会计师复核 |
| **Description** | No obligation to continue | 没有义务继续 |
| **Button** | Send WhatsApp message | Send WhatsApp message |
| **WhatsApp prefill** | Hi! I saw your ad (ref B-ad-b5-en). I'd like the 5-minute demo. | 你好！我看到你们的广告（ref B-ad-b5-zh），想看 5 分钟演示。 |
| **Landing URL** | `https://<your-landing-page>/?v=b&lang=en&src=ad-b5-en` | `https://<your-landing-page>/?v=b&lang=zh&src=ad-b5-zh` |

## Pitch C · Catch costly supplier invoice mistakes

### C1 · Question hook

**Creative:** clip-c-invoices-20s (9:16) for Reels/Stories; en-suppliers.webp / zh-suppliers.webp for Feed

| | English | 中文 |
|---|---|---|
| **Primary text** | Same supplier invoice entered twice? Paid twice? Price up more than 5%? We check every invoice line from your own records, and an ACCA-qualified accountant reviews each flag. | 同一张发票输入两次？付了两次？涨价超过 5%？我们用你自己的记录逐行检查，每一个标记都由 ACCA 会计师复核。 |
| **Headline** | Catch supplier invoice mistakes | 抓出供应商发票的错 |
| **Description** | Accountant-checked · RM300 pilot | 会计师复核 · RM300 试点 |
| **Button** | Send WhatsApp message | Send WhatsApp message |
| **WhatsApp prefill** | Hi! I saw your ad (ref C-ad-c1-en). I'd like the 5-minute demo. | 你好！我看到你们的广告（ref C-ad-c1-zh），想看 5 分钟演示。 |
| **Landing URL** | `https://<your-landing-page>/?v=c&lang=en&src=ad-c1-en` | `https://<your-landing-page>/?v=c&lang=zh&src=ad-c1-zh` |

### C2 · Demo-data example

**Creative:** en-health.webp / zh-health.webp (crop the duplicate + overpayment cards, demo label visible)

| | English | 中文 |
|---|---|---|
| **Primary text** | Demo shop (fictional data): 6 possible duplicate invoices worth RM 4,783.20, and 2 invoices possibly overpaid by RM 8,410.86 in total. Each one comes with the exact rows. | 示范店（虚构资料）：6 项可能重复的发票，共 RM 4,783.20；还有 2 张发票可能多付，共 RM 8,410.86。每一项都附上原始行。 |
| **Headline** | Possible duplicate invoices? | 发票可能重复了？ |
| **Description** | Demo data · accountant-checked | 示范资料 · 会计师复核 |
| **Button** | Send WhatsApp message | Send WhatsApp message |
| **WhatsApp prefill** | Hi! I saw your ad (ref C-ad-c2-en). I'd like the 5-minute demo. | 你好！我看到你们的广告（ref C-ad-c2-zh），想看 5 分钟演示。 |
| **Landing URL** | `https://<your-landing-page>/?v=c&lang=en&src=ad-c2-en` | `https://<your-landing-page>/?v=c&lang=zh&src=ad-c2-zh` |

### C3 · Accountant / trust

**Creative:** en-evidence.webp / zh-evidence.webp (source rows dialog)

| | English | 中文 |
|---|---|---|
| **Primary text** | A flag isn't an accusation. Possible duplicates and overpayments come with the exact invoice rows, and an accountant checks each one before you see it. | 标记不是指责。可能重复、可能多付的发票，都附上原始行，每一项都先由会计师核对，才交给你。 |
| **Headline** | Invoice checks, with evidence | 有证据的发票检查 |
| **Description** | Accountant-checked | 会计师复核 |
| **Button** | Send WhatsApp message | Send WhatsApp message |
| **WhatsApp prefill** | Hi! I saw your ad (ref C-ad-c3-en). I'd like the 5-minute demo. | 你好！我看到你们的广告（ref C-ad-c3-zh），想看 5 分钟演示。 |
| **Landing URL** | `https://<your-landing-page>/?v=c&lang=en&src=ad-c3-en` | `https://<your-landing-page>/?v=c&lang=zh&src=ad-c3-zh` |

### C4 · Timely or practical

**Creative:** docs/screenshots/05-suppliers.png (crop: supplier price increases above 5%)

| | English | 中文 |
|---|---|---|
| **Primary text** | Supplier prices creep up. See every price rise above 5%, line by line, and which ones never reached your shelf price. | 供应商价钱慢慢涨。每一个超过 5% 的涨价都逐行列出，还看得到哪些没反映到卖价。 |
| **Headline** | Spot supplier price rises | 看清供应商涨价 |
| **Description** | Accountant-checked · RM300 | 会计师复核 · RM300 |
| **Button** | Send WhatsApp message | Send WhatsApp message |
| **WhatsApp prefill** | Hi! I saw your ad (ref C-ad-c4-en). I'd like the 5-minute demo. | 你好！我看到你们的广告（ref C-ad-c4-zh），想看 5 分钟演示。 |
| **Landing URL** | `https://<your-landing-page>/?v=c&lang=en&src=ad-c4-en` | `https://<your-landing-page>/?v=c&lang=zh&src=ad-c4-zh` |

### C5 · Offer and process

**Creative:** Text card: "Supplier invoice check · RM300 · files never shared" + en-suppliers.webp

| | English | 中文 |
|---|---|---|
| **Primary text** | Send your supplier invoices and payments (Excel or CSV). Files stay on an encrypted laptop and are never shared or sold. In about 2 weeks, go through the findings with an accountant. RM300. | 提供供应商发票和付款记录（Excel 或 CSV）。资料放在加密手提电脑，绝不分享、绝不出售。大约 2 个星期后，跟会计师一起看结果。RM300。 |
| **Headline** | Supplier invoice check, RM300 | 供应商发票检查 RM300 |
| **Description** | Files never shared or sold | 资料绝不分享或出售 |
| **Button** | Send WhatsApp message | Send WhatsApp message |
| **WhatsApp prefill** | Hi! I saw your ad (ref C-ad-c5-en). I'd like the 5-minute demo. | 你好！我看到你们的广告（ref C-ad-c5-zh），想看 5 分钟演示。 |
| **Landing URL** | `https://<your-landing-page>/?v=c&lang=en&src=ad-c5-en` | `https://<your-landing-page>/?v=c&lang=zh&src=ad-c5-zh` |

