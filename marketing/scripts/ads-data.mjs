// Facebook/Instagram ad copy: 5 variants per pitch, EN + ZH. Run `npm run marketing:ads` to rebuild
// marketing/ads/ad-copy.md and marketing/ads/ads.csv. Rules: marketing/BRIEF.md, and Meta's
// "personal attributes" policy: never assert or imply the viewer's financial situation
// (no "Is your shop losing money?"). Demo figures always say "demo shop (fictional data)".

export const ANGLES = {
  1: 'Question hook',
  2: 'Demo-data example',
  3: 'Accountant / trust',
  4: 'Timely or practical',
  5: 'Offer and process',
};

export const ADS = {
  a: [
    {
      creative: 'clip-a-profit-20s (9:16) for Reels/Stories; en-profit.webp / zh-profit.webp (4:5 crop) for Feed',
      en: {
        primary: 'Which products actually make money, and which sell below cost? It\'s easy to miss when supplier prices change. We check your own sales and stock exports, and an ACCA-qualified accountant in Penang reviews every finding.',
        headline: 'See your real profit by product',
        description: 'Accountant-checked · RM300 pilot',
      },
      zh: {
        primary: '哪样货真的赚钱？哪样其实低于成本在卖？供应商一涨价就很容易漏掉。我们用你店里自己的销售和库存资料检查，每一项都由槟城的 ACCA 会计师复核。',
        headline: '每样货赚多少，一次看清',
        description: '会计师复核 · RM300 试点',
      },
    },
    {
      creative: 'en-profit.webp / zh-profit.webp (below-cost findings, demo label visible)',
      en: {
        primary: 'In our demo shop (fictional data), 10 products were selling below cost: RM 3,130.27 over a year, some because supplier price rises never reached the shelf price. Want to see what a check of your own shop shows?',
        headline: 'Products sold below cost?',
        description: 'Demo data · accountant-checked',
      },
      zh: {
        primary: '在我们的示范店（虚构资料）里，有 10 种货低于成本在卖，一年少卖了 RM 3,130.27，其中有些是供应商涨价后卖价没跟着调。想知道你的店检查出来会怎样吗？',
        headline: '有货低于成本在卖吗？',
        description: '示范资料 · 会计师复核',
      },
    },
    {
      creative: 'docs/screenshots/09-rules.png (rules in plain English) or the accountant photo (with consent)',
      en: {
        primary: 'No black box. Readable rules, every finding linked to the rows in your own files, and an ACCA-qualified accountant who reviews it all with you.',
        headline: 'Accountant-checked profit check',
        description: 'Penang · RM300 one-off',
      },
      zh: {
        primary: '不是黑箱。看得懂的规则、每项发现都对得上你文件里的原始行，再由 ACCA 会计师跟你一起过一遍。',
        headline: '会计师复核的利润检查',
        description: '槟城 · 一次性 RM300',
      },
    },
    {
      creative: 'Text card: "Profit by product in about 2 weeks" over docs/screenshots/03-profit.png',
      en: {
        primary: 'Send 3–12 months of POS and stock exports. In about 2 weeks, sit down with an accountant and see profit and margin for every product. RM300, one-off.',
        headline: 'Profit by product in ~2 weeks',
        description: 'No obligation to continue',
      },
      zh: {
        primary: '提供 3–12 个月的 POS 和库存报表，大约 2 个星期后，跟会计师坐下来看每样货的利润和毛利。一次性 RM300。',
        headline: '约 2 周看清每样货利润',
        description: '没有义务继续',
      },
    },
    {
      creative: 'docs/screenshots/03-profit.png (crop: "Margin below target (25.0%)")',
      en: {
        primary: 'Target margin 25%? See which products fall below it, and decide whether that\'s on purpose. Product by product, checked by an accountant.',
        headline: 'Which products miss your margin?',
        description: 'Accountant-checked',
      },
      zh: {
        primary: '目标毛利 25%？看看哪些货低过这个数，再决定是不是故意的。一样一样看清楚，会计师复核。',
        headline: '哪些货毛利不够？',
        description: '会计师复核',
      },
    },
  ],
  b: [
    {
      creative: 'clip-b-stock-20s (9:16) for Reels/Stories; en-stock.webp / zh-stock.webp for Feed',
      en: {
        primary: 'How much cash is sitting on the shelf? See stock value by days since last sale, and which items haven\'t sold in 90+ days. Reviewed by an ACCA-qualified accountant in Penang.',
        headline: 'Find cash stuck in stock',
        description: 'Accountant-checked · RM300 pilot',
      },
      zh: {
        primary: '货架上压了多少现金？按多久没卖出看库存金额，找出超过 90 天没卖的货。由槟城的 ACCA 会计师复核。',
        headline: '找出压在货里的钱',
        description: '会计师复核 · RM300 试点',
      },
    },
    {
      creative: 'en-stock.webp / zh-stock.webp (hamper dead-stock finding, demo label visible)',
      en: {
        primary: 'Demo shop (fictional data): RM 9,392.62 in stock with no sale for 60+ days, including 27 leftover CNY hampers. What\'s on your shelves?',
        headline: 'Stock that stopped selling',
        description: 'Demo data · accountant-checked',
      },
      zh: {
        primary: '示范店（虚构资料）：RM 9,392.62 的货超过 60 天没卖出，包括 27 个过了年剩下的礼篮。你的货架上有什么？',
        headline: '卖不动的货压了多少？',
        description: '示范资料 · 会计师复核',
      },
    },
    {
      creative: 'Carousel: CNY ordering checklist cards (see social day 29)',
      en: {
        primary: 'Ordering for Chinese New Year soon? First check what\'s left from last year and how many days of stock you already have. We work it out from your own exports.',
        headline: 'Check stock before CNY orders',
        description: 'Accountant-checked',
      },
      zh: {
        primary: '快要拿农历新年的货了？先看看去年剩多少、现在的货还够卖几天。我们用你自己的报表算给你看。',
        headline: '拿年货前先看库存',
        description: '会计师复核',
      },
    },
    {
      creative: 'docs/screenshots/phone-stock.png in a phone frame',
      en: {
        primary: 'Planning a year-end clearance? Know which items have really stopped selling, and what they cost you, before you mark them down.',
        headline: 'Clear the right stock',
        description: 'Accountant-checked · RM300',
      },
      zh: {
        primary: '准备年底清货？先知道哪些货真的不动了、压了多少成本，再决定怎么减价。',
        headline: '清货先清对的货',
        description: '会计师复核 · RM300',
      },
    },
    {
      creative: 'Text card: "Your slow-stock list, checked by an accountant" + en-stock.webp',
      en: {
        primary: 'Send your sales and stock exports. Get a list of slow and possibly dead stock, valued at cost, reviewed by an ACCA-qualified accountant. RM300 one-off pilot.',
        headline: 'Your slow-stock list, checked',
        description: 'No obligation to continue',
      },
      zh: {
        primary: '提供销售和库存报表，拿到一份按成本计的滞销货和可能死货清单，由 ACCA 会计师复核。一次性 RM300 试点。',
        headline: '滞销货清单，会计师复核',
        description: '没有义务继续',
      },
    },
  ],
  c: [
    {
      creative: 'clip-c-invoices-20s (9:16) for Reels/Stories; en-suppliers.webp / zh-suppliers.webp for Feed',
      en: {
        primary: 'Same supplier invoice entered twice? Paid twice? Price up more than 5%? We check every invoice line from your own records, and an ACCA-qualified accountant reviews each flag.',
        headline: 'Catch supplier invoice mistakes',
        description: 'Accountant-checked · RM300 pilot',
      },
      zh: {
        primary: '同一张发票输入两次？付了两次？涨价超过 5%？我们用你自己的记录逐行检查，每一个标记都由 ACCA 会计师复核。',
        headline: '抓出供应商发票的错',
        description: '会计师复核 · RM300 试点',
      },
    },
    {
      creative: 'en-health.webp / zh-health.webp (crop the duplicate + overpayment cards, demo label visible)',
      en: {
        primary: 'Demo shop (fictional data): 6 possible duplicate invoices worth RM 4,783.20, and 2 invoices possibly overpaid by RM 8,410.86 in total. Each one comes with the exact rows.',
        headline: 'Possible duplicate invoices?',
        description: 'Demo data · accountant-checked',
      },
      zh: {
        primary: '示范店（虚构资料）：6 项可能重复的发票，共 RM 4,783.20；还有 2 张发票可能多付，共 RM 8,410.86。每一项都附上原始行。',
        headline: '发票可能重复了？',
        description: '示范资料 · 会计师复核',
      },
    },
    {
      creative: 'en-evidence.webp / zh-evidence.webp (source rows dialog)',
      en: {
        primary: 'A flag isn\'t an accusation. Possible duplicates and overpayments come with the exact invoice rows, and an accountant checks each one before you see it.',
        headline: 'Invoice checks, with evidence',
        description: 'Accountant-checked',
      },
      zh: {
        primary: '标记不是指责。可能重复、可能多付的发票，都附上原始行，每一项都先由会计师核对，才交给你。',
        headline: '有证据的发票检查',
        description: '会计师复核',
      },
    },
    {
      creative: 'docs/screenshots/05-suppliers.png (crop: supplier price increases above 5%)',
      en: {
        primary: 'Supplier prices creep up. See every price rise above 5%, line by line, and which ones never reached your shelf price.',
        headline: 'Spot supplier price rises',
        description: 'Accountant-checked · RM300',
      },
      zh: {
        primary: '供应商价钱慢慢涨。每一个超过 5% 的涨价都逐行列出，还看得到哪些没反映到卖价。',
        headline: '看清供应商涨价',
        description: '会计师复核 · RM300',
      },
    },
    {
      creative: 'Text card: "Supplier invoice check · RM300 · files never shared" + en-suppliers.webp',
      en: {
        primary: 'Send your supplier invoices and payments (Excel or CSV). Files stay on an encrypted laptop and are never shared or sold. In about 2 weeks, go through the findings with an accountant. RM300.',
        headline: 'Supplier invoice check, RM300',
        description: 'Files never shared or sold',
      },
      zh: {
        primary: '提供供应商发票和付款记录（Excel 或 CSV）。资料放在加密手提电脑，绝不分享、绝不出售。大约 2 个星期后，跟会计师一起看结果。RM300。',
        headline: '供应商发票检查 RM300',
        description: '资料绝不分享或出售',
      },
    },
  ],
};
