/**
 * Hand-written notes for the accountant rule-review pack (docs/accountant-review/).
 * One entry per rule in rules.config.ts: known false-positive cases and what the
 * rule can miss, in English and Simplified Chinese. A unit test fails if a rule
 * is added without notes.
 */
import type { RuleId } from '../rules/rules.config';

export type PackLang = 'en' | 'zh';
export type Bilingual = Record<PackLang, string>;
export type BilingualList = Record<PackLang, string[]>;

export interface RuleNotes {
  /** Cases where the rule flags something that is usually fine. For method rules: where the calculation is approximate. */
  falsePositives: BilingualList;
  /** What the rule does not catch. */
  mayMiss: BilingualList;
  /** Question for the accountant, shown above the decision box. */
  question: Bilingual;
}

export const RULE_NOTES: Record<RuleId, RuleNotes> = {
  'PRF-01': {
    falsePositives: {
      en: [
        'Unit cost is today\'s cost from the product list, applied to the whole period (no FIFO or weighted-average history). If a cost changed during the year, profit by product is approximate.',
        'If the POS "Total" column includes SST, revenue is overstated by the tax and margins look better than they are. The tool does not separate SST.',
        'Supplier rebates, volume incentives, free goods ("10 + 1") and promotion support are not in the product cost, so real margins may be higher.',
        'Shrinkage, expired and damaged goods are not counted (cost is units sold × unit cost), so real margins may be lower.',
        'Products with no cost (missing from the product list or cost 0) are left out of margin and listed separately.',
      ],
      zh: [
        '单位成本取自产品清单中的当前成本，并套用到整个期间（不是先进先出，也不是加权平均历史成本）。如果期间内成本有变动，按产品计算的利润只是近似值。',
        '如果 POS 的“总额”栏包含 SST，销售额会多算了税额，毛利率看起来会比实际好。本工具不会把 SST 分开。',
        '供应商回扣、销量奖励、免费货品（“10 送 1”）和促销补贴都不在产品成本里，所以实际毛利可能更高。',
        '损耗、过期和损坏的货品没有计算在内（成本 = 卖出数量 × 单位成本），所以实际毛利可能更低。',
        '没有成本的产品（不在产品清单中，或成本为 0）不计入毛利，会另外列出。',
      ],
    },
    mayMiss: {
      en: ['Profit after operating costs (rent, salaries, utilities): only gross profit is calculated.'],
      zh: ['扣除营运开销（租金、薪水、水电）后的利润：本工具只计算毛利。'],
    },
    question: {
      en: 'Is this calculation acceptable for an owner-level health check (not for the accounts)?',
      zh: '作为给老板看的健康检查（不是用来做账），这个计算方法可以接受吗？',
    },
  },
  'PRF-02': {
    falsePositives: {
      en: [
        'The cost in the product list was raised recently, but the whole period\'s sales are compared with the new cost. Sales made before the rise were not below cost (see the worked example: the supplier raised the price in May).',
        'Unit of measure mix-up: cost per carton or pack in the product list, selling price per piece in the POS (or the reverse).',
        'A planned loss leader, or a promotion where the supplier pays back the difference (promotion claim). The claim is not in these files.',
        '"Buy 1 free 1" or bundle lines recorded with a zero price on the free item.',
        'Staff purchases at or below cost.',
        'Supplier rebates that bring the real cost below the invoice cost.',
      ],
      zh: [
        '产品清单里的成本最近才调高，但整个期间的销售都拿新成本来比较。成本上涨之前的销售其实没有低于成本（见实例：供应商在 5 月涨价）。',
        '单位搞混：产品清单里的成本是每箱或每包，POS 里的售价是每件（或者相反）。',
        '有意的引客产品，或由供应商补回差价的促销（促销补贴申请）。这些补贴不在这些文件里。',
        '“买一送一”或配套组合，送出的那件以零价格记录。',
        '员工以成本价或更低价格购买。',
        '供应商回扣使实际成本低于发票成本。',
      ],
    },
    mayMiss: {
      en: ['A short promotion below cost: the average over the whole period can still be above cost.', 'Products missing from the product list (no cost to compare).'],
      zh: ['短期低于成本的促销：整个期间的平均售价可能仍高于成本。', '不在产品清单中的产品（没有成本可以比较）。'],
    },
    question: {
      en: 'Should "below cost" be judged on the whole period, or on recent months only?',
      zh: '“低于成本”应该按整个期间判断，还是只看最近几个月？',
    },
  },
  'PRF-03': {
    falsePositives: {
      en: [
        'Thin-margin staples (rice, sugar, cooking oil, flour, eggs), some of which may be price-controlled; cigarettes, prepaid top-ups and bill payments. Their normal margin is well below a general 25% target.',
        'Products the owner keeps cheap on purpose to bring customers in.',
        'Rebates and back margins from the supplier that are not in the product cost.',
        'The RM amount on the finding is the extra gross profit needed to reach the target, not money lost.',
      ],
      zh: [
        '薄利必需品（米、糖、食油、面粉、鸡蛋，其中有些可能受价格管制）、香烟、预付充值和代缴账单。这些产品的正常毛利率远低于一般 25% 的目标。',
        '老板有意卖便宜、用来吸引客人的产品。',
        '供应商给的回扣和后台毛利，没有算进产品成本。',
        '发现上显示的 RM 金额，是达到目标毛利所需的额外毛利，不是亏掉的钱。',
      ],
    },
    mayMiss: {
      en: ['Products sold below cost are reported under PRF-02 instead, not here.'],
      zh: ['低于成本出售的产品会在 PRF-02 报告，不会在这里出现。'],
    },
    question: {
      en: 'Is one target margin for all products right, or should staples have their own target? (Per-category targets are not supported yet; write the targets you would use.)',
      zh: '所有产品用同一个目标毛利率合适吗？还是必需品应该有自己的目标？（目前还不支持按类别设定目标；请写下您会用的目标。）',
    },
  },
  'STK-01': {
    falsePositives: {
      en: [
        '"Age" means days since the last sale, not days since the goods were received. It is not the stock ageing an accountant prepares from goods received notes (GRN).',
        'Stock value is quantity × current unit cost. It is not a year-end valuation (no lower of cost and net realisable value).',
        'Quantity on hand comes from the POS or stock system and is often wrong without a recent stock-take. Negative quantities count as zero.',
      ],
      zh: [
        '这里的“库龄”是指距离最后一次销售的天数，不是距离进货的天数。这不是会计师按进货单（GRN）编制的库存账龄。',
        '库存价值 = 数量 × 当前单位成本。这不是年终存货估值（没有按成本与可变现净值孰低计算）。',
        '现有库存数量来自 POS 或库存系统，如果最近没有盘点，往往不准确。负数库存以零计算。',
      ],
    },
    mayMiss: {
      en: ['Stock held at another location that is not in the product list.'],
      zh: ['存放在其他地点、不在产品清单中的库存。'],
    },
    question: {
      en: 'Is "days since last sale" a fair way to show owners where cash is stuck?',
      zh: '用“距离最后一次销售的天数”来让老板看到现金卡在哪里，这个做法合理吗？',
    },
  },
  'STK-02': {
    falsePositives: {
      en: [
        'Seasonal stock kept for next season: Chinese New Year, Hari Raya, Deepavali, Christmas, back-to-school (the worked example is a CNY hamper).',
        'The system quantity is wrong: the goods were sold, expired or thrown away but never adjusted, so the "dead stock" may not exist.',
        'Consignment or sale-or-return stock that belongs to the supplier.',
        'The item sells under another SKU or barcode, or inside a bundle or hamper.',
        'Sales through another channel that is not in the sales file (wholesale, online, an outlet whose POS was not exported).',
        'A product restocked recently that has not sold for a long time is still flagged (on purpose: the restock is the question to ask).',
      ],
      zh: [
        '留到下一个节日季节卖的季节性货品：农历新年、开斋节、屠妖节、圣诞节、开学季（实例就是一个新年礼篮）。',
        '系统数量不对：货已经卖掉、过期或丢掉，但没有调整库存，所以“死货”可能根本不存在。',
        '属于供应商的寄卖货或可退货品。',
        '该产品用另一个 SKU 或条码卖出，或放在配套组合、礼篮里卖。',
        '通过其他渠道卖出、不在销售文件里（批发、网店、没有导出 POS 资料的分店）。',
        '最近补过货、但很久没有卖出的产品仍然会被标出（这是有意的：为什么补货正是要问的问题）。',
      ],
    },
    mayMiss: {
      en: ['Overstocked items that still sell a unit now and then. Days of cover (STK-04) shows those.'],
      zh: ['库存过多、但偶尔还会卖出一件的产品。可卖天数（STK-04）会显示这些产品。'],
    },
    question: {
      en: 'Is 90 days right for a minimart? Should fresh or seasonal categories use a different number?',
      zh: '对迷你市场来说，90 天合适吗？新鲜货或季节性类别是否应该用不同的天数？',
    },
  },
  'STK-03': {
    falsePositives: {
      en: [
        'Slow-moving lines by nature (kitchenware, small electrical items, hardware), where 60 days between sales is normal.',
        'The same causes as dead stock: seasonal stock, wrong system quantity, consignment stock, sales under another SKU or channel.',
      ],
      zh: [
        '本来就卖得慢的产品（厨具、小电器、五金），两次销售相隔 60 天是正常的。',
        '与死货相同的原因：季节性货品、系统数量不对、寄卖货、用其他 SKU 或渠道卖出。',
      ],
    },
    mayMiss: {
      en: ['Overstock on items that sell often but in small numbers (see days of cover).'],
      zh: ['经常卖出但数量少的产品的库存过多（见可卖天数）。'],
    },
    question: {
      en: 'Is 60 days useful as an early warning, or does it create too many findings?',
      zh: '60 天作为提早警示有用吗？还是会产生太多发现？',
    },
  },
  'STK-04': {
    falsePositives: {
      en: [
        'Seasonality is ignored: a festive peak in the look-back period makes cover look short afterwards; a quiet period makes it look long.',
        'Days when the item was out of stock lower the average, so cover looks longer than it is.',
        'For several outlets, stock and sales are added together. One outlet may be out of stock while another is overstocked.',
      ],
      zh: [
        '没有考虑季节性：回顾期内的节日高峰，会让之后的可卖天数看起来偏短；淡季则会让它看起来偏长。',
        '缺货的日子会拉低每天平均销量，所以可卖天数看起来比实际长。',
        '有多间分店时，库存和销售是合起来算的。可能一间分店缺货，另一间却库存过多。',
      ],
    },
    mayMiss: {
      en: ['Products with no sale in the look-back period show "no recent sales" instead of a number.'],
      zh: ['回顾期内没有销售的产品会显示“最近没有销售”，而不是一个数字。'],
    },
    question: {
      en: 'Is a 90-day look-back right, or would 30 or 60 days reflect current selling better?',
      zh: '回顾 90 天合适吗？还是 30 或 60 天更能反映目前的销售？',
    },
  },
  'STK-05': {
    falsePositives: {
      en: [
        '"Fast movers" are the top 20% by units, not by value or profit.',
        'The suggestion ignores supplier lead time, minimum order quantity, carton size and shelf life. The worked example is bread, which cannot be stocked for 30 days.',
        'It is a suggestion to discuss with the supplier, not an order.',
      ],
      zh: [
        '“畅销货”是按销售数量排在前 20%，不是按金额或利润。',
        '这个建议没有考虑供应商交货时间、最低订货量、每箱数量和保质期。实例是面包，不可能存放 30 天。',
        '这只是可以和供应商商量的建议，不是订单。',
      ],
    },
    mayMiss: {
      en: ['Fast movers that are already out of stock and so show no recent sales.'],
      zh: ['已经断货、因此最近没有销售的畅销货。'],
    },
    question: {
      en: 'Is this useful to owners, or should it be removed to keep the report about money at risk?',
      zh: '这对老板有用吗？还是应该拿掉，让报告专注在有风险的钱？',
    },
  },
  'SUP-01': {
    falsePositives: {
      en: [
        'The supplier restarts its invoice numbering (each year or month), or several supplier branches use the same numbers.',
        'Two different companies with nearly the same name are treated as one supplier, because names are compared ignoring case, punctuation and "Sdn Bhd".',
        'One invoice delivered in parts and recorded on each delivery date under the same invoice number.',
        'A credit note or debit note keyed in with the original invoice number.',
        'An export that lists the invoice and its knock-off or payment line together.',
      ],
      zh: [
        '供应商重新开始编号（每年或每月），或供应商的几间分行用相同的号码。',
        '两间名字几乎一样的不同公司被当成同一个供应商，因为比较名字时不理会大小写、标点和“Sdn Bhd”。',
        '一张发票分几次送货，每次送货日期都用同一个发票号码记录。',
        '贷项通知单或借项通知单用原发票号码输入。',
        '导出的报表把发票和它的冲销（knock-off）或付款行一起列出。',
      ],
    },
    mayMiss: {
      en: ['A copy keyed in with a typing mistake in the invoice number (SUP-02 may catch it if the total is the same).'],
      zh: ['重复输入时发票号码打错了（如果总额相同，SUP-02 可能会抓到）。'],
    },
    question: {
      en: 'In your experience, are re-keyed invoices common enough to keep this as a high-severity check?',
      zh: '依您的经验，重复输入发票的情况是否常见到值得保留为高严重度的检查？',
    },
  },
  'SUP-02': {
    falsePositives: {
      en: [
        'Genuine repeat orders of the same amount: a standing weekly order (bread, newspapers, ice), or the same fixed order each time.',
        'Fixed charges that are the same every time: delivery fee, chiller or display rental.',
      ],
      zh: [
        '真正的重复订单、金额相同：每周固定订单（面包、报纸、冰块），或每次都一样的固定订货。',
        '每次金额都一样的固定收费：运费、冷藏柜或陈列架租金。',
      ],
    },
    mayMiss: {
      en: ['A copy whose total differs by a few sen (rounding, SST) or that is dated more than the window apart.'],
      zh: ['总额相差几仙（四舍五入、SST）的副本，或日期相隔超过设定天数的副本。'],
    },
    question: {
      en: 'Is 7 days the right window? Is "exactly the same total" too strict or too loose?',
      zh: '7 天的范围合适吗？“总额完全相同”是太严格还是太宽松？',
    },
  },
  'SUP-03': {
    falsePositives: {
      en: [
        'The price returns to normal after a promotion: the previous price was a discounted price.',
        'A different pack size or unit of measure under the same SKU or description (carton vs piece).',
        'Free goods: a line with "10 + 1" free units lowers that invoice\'s unit price, so the next normal price looks like a rise.',
        'SST included on one invoice and not on another.',
        'Without an SKU, items are matched by description, so two different items with the same description are compared.',
      ],
      zh: [
        '促销结束后价格恢复正常：上一次的价格是折扣价。',
        '同一个 SKU 或项目说明下，包装大小或单位不同（箱和件）。',
        '免费货品：有“10 送 1”的那一行单价会被拉低，所以下一次的正常价格看起来像涨价。',
        '一张发票含 SST，另一张不含。',
        '没有 SKU 时按项目说明对比，所以两样说明相同的不同货品会被拿来比较。',
      ],
    },
    mayMiss: {
      en: ['Lines with no quantity or unit price (only a total) cannot be compared and are skipped.', 'Many small rises, each below the threshold.'],
      zh: ['没有数量或单价（只有总额）的行无法比较，会被跳过。', '许多次小幅涨价，每次都低于门槛。'],
    },
    question: {
      en: 'Is a 5% rise the right trigger for a minimart?',
      zh: '对迷你市场来说，5% 的涨幅作为门槛合适吗？',
    },
  },
  'SUP-04': {
    falsePositives: {
      en: [
        'One lump-sum payment for several invoices whose reference names only one of them: the whole payment is matched to that invoice, which then looks overpaid.',
        'The payment includes a deposit or advance for a later order, or other charges (delivery, an old balance).',
        'A cheque was cancelled or bounced and paid again, but both appear in the payment listing.',
        'Several invoices from the same supplier with the same amount: amount matching may pick the wrong one.',
      ],
      zh: [
        '一笔整数付款支付几张发票，但参考号只写了其中一张：整笔付款会对应到那张发票，看起来就像多付了。',
        '付款包括下一次订货的订金或预付款，或其他费用（运费、旧欠款）。',
        '支票被取消或退票后再付一次，但两笔都出现在付款清单里。',
        '同一供应商有几张金额相同的发票：按金额对应时可能对错发票。',
      ],
    },
    mayMiss: {
      en: ['Overpayments smaller than the tolerance.', 'Payments to the wrong supplier (see SUP-05).'],
      zh: ['小于容差的多付款项。', '付错供应商的款项（见 SUP-05）。'],
    },
    question: {
      en: 'Is RM 1 the right tolerance, and is a 120-day matching window reasonable?',
      zh: 'RM 1 的容差合适吗？120 天的对应期间合理吗？',
    },
  },
  'SUP-05': {
    falsePositives: {
      en: [
        'Deposits or advance payments (in the demo data: "DEPOSIT HAMPER ORDER", payments row 633).',
        'Payment for an invoice dated before the start of the invoices file. This is common in the first weeks of the period.',
        'The invoice has not been entered yet (it arrived late).',
        'A lump-sum payment for several invoices with no reference and an amount that matches no single invoice.',
        'The supplier name in the payment file differs from the invoices (bank payee name vs trading name).',
        'Non-stock payments (rent, utilities) included in the payments file.',
      ],
      zh: [
        '订金或预付款（示范资料中：“DEPOSIT HAMPER ORDER”，付款第 633 行）。',
        '支付的发票日期早于发票文件的开始日期。这在期间开头几周很常见。',
        '发票还没有输入（迟到的发票）。',
        '一笔没有参考号的整数付款支付几张发票，金额与任何一张发票都不相同。',
        '付款文件中的供应商名称与发票不同（银行收款人名称和商号名称）。',
        '付款文件中包括非货品的付款（租金、水电）。',
      ],
    },
    mayMiss: {
      en: ['A payment to the wrong supplier whose amount happens to match one of that supplier\'s invoices.'],
      zh: ['付错供应商、但金额刚好与该供应商某张发票相同的款项。'],
    },
    question: {
      en: 'Should payments dated in the first month be ignored, to avoid flagging last period\'s invoices?',
      zh: '是否应该忽略第一个月的付款，以免标出上一期的发票？',
    },
  },
  'CSH-01': {
    falsePositives: {
      en: [
        'Cash in = sales in the same week. Card and e-wallet settlement delays and credit customers are not modelled.',
        'A straight-line trend ignores festive peaks (CNY, Hari Raya) and school holidays. Just after a peak the trend can point the wrong way.',
        'Not included unless entered as fixed monthly costs: loans and hire purchase, income tax instalments (CP204), SST payments, EPF/SOCSO, owner drawings, equipment purchases.',
        'Restocking is estimated as forecast sales × the historical cost ratio, paid after the default terms. It is rough.',
        'Without a payments file, invoices due before the forecast start are assumed paid.',
      ],
      zh: [
        '现金流入 = 同一周的销售。没有考虑信用卡和电子钱包的结算延迟，也没有考虑赊账客户。',
        '直线趋势没有考虑节日高峰（农历新年、开斋节）和学校假期。高峰刚过时，趋势可能指向错误的方向。',
        '除非输入为每月固定开销，否则不包括：贷款和分期付款、所得税分期（CP204）、SST 缴付、EPF/SOCSO、老板提款、购买设备。',
        '补货开销的估计 = 预测销售额 × 过往成本比率，在默认付款期限后支付。这只是粗略估计。',
        '没有付款文件时，假设预测开始前到期的发票都已付清。',
      ],
    },
    mayMiss: {
      en: ['Anything outside the next 8 weeks.'],
      zh: ['8 周以后的任何事情。'],
    },
    question: {
      en: 'Is this method clear and cautious enough to show an owner, with the word "estimate" on it?',
      zh: '这个方法够清楚、够谨慎，可以标上“估计”给老板看吗？',
    },
  },
  'CSH-02': {
    falsePositives: {
      en: [
        'Supplier invoices that were already paid, when the payments file is incomplete or missing: unpaid invoices are overstated and a short week appears that is not real.',
        'Possible duplicate invoices (SUP-01, SUP-02) that are still unpaid add to the cash going out.',
        'The opening balance is out of date, or the shop has an overdraft facility. In that case set the minimum balance to minus the overdraft limit.',
        'Suppliers who in practice accept payment later than the due date in the file.',
      ],
      zh: [
        '已经付清的供应商发票，在付款文件不完整或没有付款文件时：未付发票被高估，出现了其实不存在的现金不足周。',
        '尚未付款的可能重复发票（SUP-01、SUP-02）会增加现金流出。',
        '期初结余不是最新的，或店铺有透支额度。这种情况下，请把最低结余设为负的透支额度。',
        '实际上接受在文件所列到期日之后才付款的供应商。',
      ],
    },
    mayMiss: {
      en: ['Large payments not in any file (tax, loan repayment, a big festive order not yet invoiced).'],
      zh: ['不在任何文件里的大笔付款（税款、还贷、还没有开发票的大笔节日订货）。'],
    },
    question: {
      en: 'Is RM 0 the right default minimum, or should it be, say, two weeks of fixed costs?',
      zh: '默认最低结余 RM 0 合适吗？还是应该设为例如两周的固定开销？',
    },
  },
};
