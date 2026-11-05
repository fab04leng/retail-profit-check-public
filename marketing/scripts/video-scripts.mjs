// Timelines and caption text for the demo videos (used by record-videos.mjs).
// Every video shows a permanent "Demo data · fictional shop" badge; every figure is from the demo shop.
// Wording rules: marketing/BRIEF.md ("possible", "may", "estimate"; no AI, fraud or savings claims).

const COMMON = {
  en: {
    badge: 'Demo data · fictional shop',
    endFoot: 'Demo data from a fictional shop. An analysis aid: not audited accounts or tax advice, and it does not replace your accountant.',
    endTitle: 'Accountant-checked. RM300 one-off pilot.',
    endCta: 'WhatsApp us for a 5-minute demo',
    endSub: 'Reviewed by an ACCA-qualified accountant in Penang.',
  },
  zh: {
    badge: '示范资料 · 虚构店铺',
    endFoot: '示范资料来自虚构店铺。只是分析辅助，不是审计账目或税务意见，也不取代你的会计师。',
    endTitle: '会计师复核 · RM300 一次性试点',
    endCta: 'WhatsApp 我们，看 5 分钟演示',
    endSub: '由槟城的 ACCA 会计师复核。',
  },
};

const FULL_TEXT = {
  en: {
    introTitle: 'An accountant-checked health check for your shop',
    introSub: 'Profit · Stock · Supplier invoices · Cash flow',
    introFoot: 'Demo data: "Pinangria Mart" is a fictional shop. All names and numbers are made up.',
    c1: 'Start with your own exports: sales, stock list, supplier invoices.',
    c2: 'They are checked in your browser. Today: a fictional demo shop.',
    c3: 'The health check: five numbers in RM, each linked to its rows.',
    c4: 'Cash stuck in slow stock, sales below cost, possible duplicate invoices…',
    c5: '…possible overpayments, and the tightest cash week ahead (an estimate).',
    c6: 'Stock: how much is tied up, by days since the last sale.',
    c7: 'Possible dead stock: no sale in 90+ days. Here, leftover CNY hampers.',
    c8: 'Supplier invoices: the same invoice number entered twice?',
    c9: 'Every finding shows the exact rows from your own files.',
    c10: 'Cash flow: an 8-week estimate of your weekly balance.',
    c11: 'This week may dip below zero: a big supplier payment falls due.',
    c12: 'An ACCA-qualified accountant reviews every finding before your report.',
    c13: 'An analysis aid. Not audited accounts, not tax advice.',
    endSub: 'Your own data, reviewed by an ACCA-qualified accountant in Penang.',
  },
  zh: {
    introTitle: '会计师复核的零售店数字体检',
    introSub: '利润 · 库存 · 供应商发票 · 现金流',
    introFoot: '示范资料："Pinangria Mart" 是虚构店铺，所有名称和数字都是编的。',
    c1: '先导出你自己的资料：销售、库存清单、供应商发票。',
    c2: '资料只在浏览器里分析。今天用的是虚构的示范店。',
    c3: '健康检查：五个令吉数字，每个都能点开看来源。',
    c4: '压在滞销货的钱、低于成本卖的货、可能重复的发票……',
    c5: '……可能多付的货款，还有未来最紧的那一周（估算）。',
    c6: '库存：按多久没卖出，看压了多少钱。',
    c7: '可能的死货：超过 90 天没卖出。这里是过了年剩下的礼篮。',
    c8: '供应商发票：同一个发票号码输入了两次？',
    c9: '每一项发现，都看得到你文件里的原始行。',
    c10: '现金流：未来 8 周每周结余的估算。',
    c11: '这一周可能跌破零：刚好有一大笔货款到期。',
    c12: '每一项发现，都由 ACCA 会计师复核后才写进报告。',
    c13: '只是分析辅助，不是审计账目，也不是税务意见。',
    endSub: '用你自己的资料，由槟城的 ACCA 会计师复核。',
  },
};

const CLIP_TEXT = {
  a: {
    en: {
      title: 'See your real profit, product by product.',
      sub: 'Accountant-checked. Made for retail shops.',
      c1: 'In the demo shop, 10 products sold below cost.',
      c2: 'For each one: average selling price vs unit cost.',
      c3: 'Plus products under your target margin.',
    },
    zh: {
      title: '每样货到底赚多少，一次看清楚。',
      sub: '会计师复核 · 专为零售店',
      c1: '示范店里，有 10 种货低于成本在卖。',
      c2: '每一项：平均卖价 vs 单位成本，清清楚楚。',
      c3: '还有毛利低过你目标的货。',
    },
  },
  b: {
    en: {
      title: 'How much of your cash is sitting on the shelf?',
      sub: 'Accountant-checked. Made for retail shops.',
      c1: 'Stock value by days since the last sale.',
      c2: 'Demo shop: RM 9,392.62 in stock with no sale for 60+ days.',
      c3: 'Biggest item: leftover CNY hampers, no sale for 251 days.',
      c4: 'Then decide what to clear, return or stop reordering.',
    },
    zh: {
      title: '你有多少现金，正压在货架上？',
      sub: '会计师复核 · 专为零售店',
      c1: '按多久没卖出，看库存压了多少钱。',
      c2: '示范店：RM 9,392.62 的货超过 60 天没卖出。',
      c3: '最大的一项：过了年剩下的大礼篮，251 天没卖出。',
      c4: '再决定要清货、退货，还是不再补货。',
    },
  },
  c: {
    en: {
      title: 'Catch costly supplier invoice mistakes.',
      sub: 'Accountant-checked. Made for retail shops.',
      c1: 'Possible duplicate: the same invoice number, entered twice.',
      c2: 'Open it to see the exact rows, with row numbers.',
      c3: 'Invoices that may have been paid twice are flagged too.',
      c4: 'An accountant checks every flag before you see it.',
    },
    zh: {
      title: '供应商发票出错，你抓得到吗？',
      sub: '会计师复核 · 专为零售店',
      c1: '可能重复：同一个发票号码，输入了两次。',
      c2: '点开就看到原始行和行号，自己可以核对。',
      c3: '可能付了两次的发票，也会标出来。',
      c4: '每一项都先由会计师复核，才交给你。',
    },
  },
};

function endCard(lang, sub) {
  const c = COMMON[lang];
  return { title: c.endTitle, sub, cta: c.endCta, foot: c.endFoot };
}

function full(lang) {
  const T = FULL_TEXT[lang];
  return {
    id: `demo-full-60s-${lang}`,
    lang,
    format: 'landscape',
    startOn: 'start',
    badge: COMMON[lang].badge,
    intro: { title: T.introTitle, sub: T.introSub, foot: T.introFoot },
    async run(a) {
      const { page } = a;
      await a.wait(2800);
      await a.card(null);
      await a.wait(400);
      await a.caption(T.c1);
      await a.wait(2800);
      await a.caption(T.c2);
      await a.click(page.getByTestId('load-demo'));
      await page.waitForURL(/#\/health/, { timeout: 60_000 });
      await page.getByTestId('headline-slowStock').waitFor();
      await a.wait(800);
      await a.caption(T.c3);
      await a.wait(2800);
      await a.caption(T.c4);
      await a.scrollTo(page.getByTestId('headline-slowStock'), { offset: 80 });
      await a.cursorTo(page.getByTestId('headline-duplicates').locator('.headline-amount'));
      await a.wait(2000);
      await a.caption(T.c5);
      await a.scrollTo(page.getByTestId('headline-payments'), { offset: 80 });
      await a.cursorTo(page.getByTestId('headline-cashLow').locator('.headline-amount'));
      await a.wait(2200);

      await a.caption(null);
      await a.nav('stock');
      await a.scrollTo(page.locator('main h2').first(), { offset: 80, ms: 700 });
      await a.caption(T.c6);
      await a.wait(2600);
      await a.caption(T.c7);
      await a.scrollTo(page.locator('h2.section-title').first(), { offset: 80 });
      await a.cursorTo(page.locator('article.finding').first().locator('.finding-subject'));
      await a.wait(2800);

      await a.caption(null);
      await a.nav('suppliers');
      await a.scrollTo(page.locator('h2.section-title').first(), { offset: 80, ms: 700 });
      await a.caption(T.c8);
      await a.cursorTo(page.locator('article.finding').first().locator('.finding-subject'));
      await a.wait(2000);
      await a.caption(T.c9);
      await a.click(page.locator('article.finding').first().getByRole('button').first());
      await page.getByRole('dialog').waitFor();
      await a.raise();
      await a.wait(3200);
      await page.keyboard.press('Escape');
      await a.caption(null);

      await a.nav('cashflow');
      await a.scrollTo(page.locator('main h2').nth(1), { offset: 80, ms: 700 });
      await a.caption(T.c10);
      await a.wait(2800);
      await a.caption(T.c11);
      await a.scrollTo(page.locator('table .chip-critical').first(), { offset: 330 });
      await a.cursorTo(page.locator('table .chip-critical').first());
      await a.wait(2600);

      await a.caption(null);
      await a.nav('report');
      await a.scrollTo(page.locator('main h2').first(), { offset: 90, ms: 700 });
      await a.caption(T.c12);
      await a.wait(3000);
      await a.caption(T.c13);
      await a.wait(2600);
      await a.caption(null);
      await a.card(endCard(lang, T.endSub));
      await a.wait(5000);
    },
  };
}

function clip(pitch, name, lang, run) {
  const T = CLIP_TEXT[pitch][lang];
  return {
    id: `clip-${pitch}-${name}-20s-${lang}`,
    lang,
    format: 'vertical',
    startOn: 'health',
    badge: COMMON[lang].badge,
    intro: { title: T.title, sub: T.sub, foot: COMMON[lang].badge },
    async run(a) {
      await a.wait(2300);
      await a.card(null);
      await a.wait(200);
      await run(a, T);
      await a.caption(null);
      await a.card(endCard(lang, COMMON[lang].endSub));
      await a.wait(4000);
    },
  };
}

async function clipProfit(a, T) {
  const { page } = a;
  await a.scrollTo(page.getByTestId('headline-belowCost'), { offset: 60 });
  await a.caption(T.c1);
  await a.cursorTo(page.getByTestId('headline-belowCost').locator('.headline-amount'));
  await a.wait(2600);
  await a.caption(null);
  await a.go('profit');
  await a.scrollTo(page.locator('h2.section-title').first(), { offset: 60, ms: 700 });
  await a.caption(T.c2);
  await a.cursorTo(page.locator('article.finding').first().locator('.finding-subject'));
  await a.wait(3200);
  await a.caption(T.c3);
  await a.scrollTo(page.locator('h2.section-title').nth(1), { offset: 60 });
  await a.wait(3000);
}

async function clipStock(a, T) {
  const { page } = a;
  await a.go('stock');
  await a.scrollTo(page.locator('main h2').first(), { offset: 60, ms: 600 });
  await a.caption(T.c1);
  await a.wait(2600);
  await a.caption(T.c2);
  await a.wait(2800);
  await a.caption(T.c3);
  await a.scrollTo(page.locator('h2.section-title').first(), { offset: 60 });
  await a.cursorTo(page.locator('article.finding').first().locator('.finding-subject'));
  await a.wait(2800);
  await a.caption(T.c4);
  await a.scrollTo(page.locator('article.finding').nth(2), { offset: 60, ms: 1600 });
  await a.wait(1600);
}

async function clipInvoices(a, T) {
  const { page } = a;
  await a.go('suppliers');
  await a.scrollTo(page.locator('h2.section-title').first(), { offset: 60, ms: 600 });
  await a.caption(T.c1);
  await a.cursorTo(page.locator('article.finding').first().locator('.finding-subject'));
  await a.wait(2400);
  await a.caption(T.c2);
  await a.click(page.locator('article.finding').first().getByRole('button').first());
  await page.getByRole('dialog').waitFor();
  await a.raise();
  await a.wait(3000);
  await page.keyboard.press('Escape');
  await a.wait(300);
  await a.caption(T.c3);
  await a.scrollTo(page.locator('h2.section-title', { hasText: 'SUP-04' }), { offset: 60 });
  await a.cursorTo(page.locator('h2.section-title', { hasText: 'SUP-04' }));
  await a.wait(2600);
  await a.caption(T.c4);
  await a.wait(2400);
}

export const VIDEOS = ['en', 'zh'].flatMap((lang) => [
  full(lang),
  clip('a', 'profit', lang, clipProfit),
  clip('b', 'stock', lang, clipStock),
  clip('c', 'invoices', lang, clipInvoices),
]);
