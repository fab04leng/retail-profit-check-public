/**
 * Every rule and threshold the tool uses lives in this one file.
 *
 * Each rule has:
 *   - id:          a stable code shown next to every finding (e.g. "SUP-01")
 *   - area:        which analysis it belongs to
 *   - title / description / why: plain English, shown on the Rules page
 *   - thresholds:  the numbers an accountant can change, with units and limits
 *
 * The analyses read thresholds ONLY through `Settings` (see settings.ts), whose
 * defaults come from here. Nothing in the analysis code hard-codes a number
 * that changes what gets flagged.
 *
 * Translations of title/description/why are in src/i18n/*.ts under
 * `rules.<id>.*`; the English text here is the reference wording.
 */

export type RuleArea = 'profit' | 'stock' | 'suppliers' | 'cashflow';

export type ThresholdUnit = 'percent' | 'days' | 'weeks' | 'rm';

export interface ThresholdDef {
  /** Key used in Settings. */
  key: ThresholdKey;
  label: string;
  unit: ThresholdUnit;
  default: number;
  min: number;
  max: number;
  step: number;
}

export interface RuleDef {
  id: RuleId;
  area: RuleArea;
  /** 'flag' rules create findings; 'method' rules only describe a calculation. */
  kind: 'flag' | 'method';
  /** 'info' only for 'method' rules. */
  severity: 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  why: string;
  thresholds: ThresholdDef[];
}

export type RuleId =
  | 'PRF-01'
  | 'PRF-02'
  | 'PRF-03'
  | 'STK-01'
  | 'STK-02'
  | 'STK-03'
  | 'STK-04'
  | 'STK-05'
  | 'SUP-01'
  | 'SUP-02'
  | 'SUP-03'
  | 'SUP-04'
  | 'SUP-05'
  | 'CSH-01'
  | 'CSH-02';

export type ThresholdKey =
  | 'targetMarginPct'
  | 'deadStockDays'
  | 'slowStockDays'
  | 'coverLookbackDays'
  | 'reorderBelowCoverDays'
  | 'reorderTargetCoverDays'
  | 'duplicateWindowDays'
  | 'priceIncreasePct'
  | 'paymentTolerance'
  | 'paymentMatchWindowDays'
  | 'defaultTermsDays'
  | 'trendWeeks'
  | 'minimumBalance';

export const RULES: readonly RuleDef[] = [
  {
    id: 'PRF-01',
    area: 'profit',
    kind: 'method',
    severity: 'info',
    title: 'How profit is calculated',
    description:
      'Revenue = sales line totals after discounts, minus refunds (negative quantities). Cost of goods sold = net units sold × unit cost from your product list. Gross profit = revenue − cost. Margin % = gross profit ÷ revenue.',
    why: 'Owners often look at sales, not profit. A product can sell a lot and still make little or no money.',
    thresholds: [],
  },
  {
    id: 'PRF-02',
    area: 'profit',
    kind: 'flag',
    severity: 'high',
    title: 'Product sold below cost',
    description:
      'Flags a product when its average selling price per unit (after discounts and refunds) is lower than its unit cost in the product list.',
    why: 'Every unit sold below cost reduces profit. Common causes: cost went up but the shelf price did not, wrong price in the POS, or a promotion left running.',
    thresholds: [],
  },
  {
    id: 'PRF-03',
    area: 'profit',
    kind: 'flag',
    severity: 'medium',
    title: 'Margin below target',
    description:
      'Flags a product that makes a profit but whose gross margin is below the target margin.',
    why: 'Thin-margin products may still be worth selling (traffic builders), but the owner should choose that on purpose.',
    thresholds: [
      { key: 'targetMarginPct', label: 'Target gross margin', unit: 'percent', default: 25, min: 0, max: 90, step: 1 },
    ],
  },
  {
    id: 'STK-01',
    area: 'stock',
    kind: 'method',
    severity: 'info',
    title: 'Stock value and age',
    description:
      'Stock value = quantity on hand × unit cost. Age = days from the last sale of that product to the analysis date (the latest sale date in the file). If a product never sold in the period, age is counted from its last received date, or from the first date in the sales file. Age groups: 0–30, 31–60, 61–90, 91–180 and over 180 days. Negative quantities on hand count as zero.',
    why: 'Money sitting in stock that does not sell cannot pay rent, salaries or suppliers.',
    thresholds: [],
  },
  {
    id: 'STK-02',
    area: 'stock',
    kind: 'flag',
    severity: 'high',
    title: 'Dead stock',
    description: 'Flags a product with stock on hand and no sale for more than the dead-stock number of days.',
    why: 'Dead stock ties up cash and often has to be cleared at a discount. The earlier it is found, the more of its value can be recovered.',
    thresholds: [
      { key: 'deadStockDays', label: 'No sale for more than', unit: 'days', default: 90, min: 14, max: 365, step: 1 },
    ],
  },
  {
    id: 'STK-03',
    area: 'stock',
    kind: 'flag',
    severity: 'low',
    title: 'Slow stock',
    description:
      'Flags a product with stock on hand and no sale for more than the slow-stock number of days, but not yet dead stock. The health-check "slow stock" number adds up slow and dead stock.',
    why: 'Shows how much cash could be freed by selling down or not reordering slow lines.',
    thresholds: [
      { key: 'slowStockDays', label: 'No sale for more than', unit: 'days', default: 60, min: 7, max: 365, step: 1 },
    ],
  },
  {
    id: 'STK-04',
    area: 'stock',
    kind: 'method',
    severity: 'info',
    title: 'Days of stock cover',
    description:
      'Days of cover = quantity on hand ÷ average units sold per day over the look-back period. Products with no sales in the look-back period show "no recent sales".',
    why: 'Tells you how long current stock will last at the recent selling rate, so you can avoid over-ordering.',
    thresholds: [
      { key: 'coverLookbackDays', label: 'Look-back period', unit: 'days', default: 90, min: 7, max: 365, step: 1 },
    ],
  },
  {
    id: 'STK-05',
    area: 'stock',
    kind: 'method',
    severity: 'info',
    title: 'Reorder suggestion for fast movers',
    description:
      'Fast movers are the top 20% of products by units sold in the look-back period. When one has fewer days of cover than the reorder point, the suggested quantity is: average units per day × target days of cover − quantity on hand, rounded up. It is a suggestion to discuss with the supplier, not an order.',
    why: 'Running out of a best seller loses sales and customers; topping up only what sells avoids adding to slow stock.',
    thresholds: [
      { key: 'reorderBelowCoverDays', label: 'Suggest a reorder below', unit: 'days', default: 14, min: 1, max: 120, step: 1 },
      { key: 'reorderTargetCoverDays', label: 'Top up to', unit: 'days', default: 30, min: 2, max: 180, step: 1 },
    ],
  },
  {
    id: 'SUP-01',
    area: 'suppliers',
    kind: 'flag',
    severity: 'high',
    title: 'Possible duplicate invoice (same invoice number)',
    description:
      'Flags when the same supplier and the same invoice number appear on different dates, or when all the lines of an invoice were entered twice. Invoice numbers are compared ignoring spaces, dashes and upper/lower case (so "INV-0012" = "inv 0012").',
    why: 'An invoice keyed in twice may also be paid twice. The accountants we spoke to said these are often found only at the year-end audit, if at all.',
    thresholds: [],
  },
  {
    id: 'SUP-02',
    area: 'suppliers',
    kind: 'flag',
    severity: 'medium',
    title: 'Possible duplicate invoice (same amount, close dates)',
    description:
      'Flags two invoices from the same supplier with different invoice numbers but exactly the same total (to the sen), dated within the window of each other.',
    why: 'A supplier may re-send an invoice under a new number, or a statement may be keyed in as a new invoice. It may also be a genuine repeat order, so it needs review.',
    thresholds: [
      { key: 'duplicateWindowDays', label: 'Within', unit: 'days', default: 7, min: 0, max: 60, step: 1 },
    ],
  },
  {
    id: 'SUP-03',
    area: 'suppliers',
    kind: 'flag',
    severity: 'medium',
    title: 'Supplier price increase',
    description:
      'For each supplier and item (SKU, or description if there is no SKU), compares each invoice unit price with the previous unit price from that supplier. Flags increases larger than the threshold.',
    why: 'Small price rises are easy to miss and quietly cut margin unless shelf prices are updated or the supplier is challenged.',
    thresholds: [
      { key: 'priceIncreasePct', label: 'Increase larger than', unit: 'percent', default: 5, min: 0, max: 100, step: 0.5 },
    ],
  },
  {
    id: 'SUP-04',
    area: 'suppliers',
    kind: 'flag',
    severity: 'high',
    title: 'Invoice possibly overpaid or paid twice',
    description:
      'Matches payments to invoices: first by the payment reference containing the invoice number (same supplier), otherwise by the same supplier and exactly the same amount on or after the invoice date (within the matching window). Flags an invoice when the payments matched to it add up to more than the invoice total plus the tolerance. Only runs when a payments file is provided.',
    why: 'An overpayment may be recoverable from the supplier, but only if someone notices it.',
    thresholds: [
      { key: 'paymentTolerance', label: 'Tolerance', unit: 'rm', default: 1, min: 0, max: 100, step: 0.5 },
      { key: 'paymentMatchWindowDays', label: 'Amount-matching window after invoice date', unit: 'days', default: 120, min: 7, max: 365, step: 1 },
    ],
  },
  {
    id: 'SUP-05',
    area: 'suppliers',
    kind: 'flag',
    severity: 'medium',
    title: 'Payment with no matching invoice',
    description:
      'Flags a payment that could not be matched to any invoice from the same supplier using the matching method in SUP-04. Only runs when a payments file is provided.',
    why: 'Could be a deposit, an invoice missing from the file, or a payment to the wrong supplier. All need a document.',
    thresholds: [],
  },
  {
    id: 'CSH-01',
    area: 'cashflow',
    kind: 'method',
    severity: 'info',
    title: 'How the 8-week cash outlook is estimated',
    description:
      'Cash in: a straight-line trend (least squares) is drawn through weekly sales of the last complete weeks and extended 8 weeks ahead (never below zero). Cash out: unpaid supplier invoices in the week they are due (overdue ones in week 1; invoices with no due date are due after the default terms), fixed monthly costs you enter on their day of the month, and, if switched on, estimated restocking: forecast sales × your historical cost ratio, paid after the default supplier terms. Weeks run Monday to Sunday. This is an estimate, not a promise.',
    why: 'A shop can be profitable and still run short of cash in a particular week, for example when a big supplier payment and rent fall together.',
    thresholds: [
      { key: 'trendWeeks', label: 'Weeks of sales used for the trend', unit: 'weeks', default: 8, min: 2, max: 26, step: 1 },
      { key: 'defaultTermsDays', label: 'Default supplier terms', unit: 'days', default: 30, min: 0, max: 120, step: 1 },
    ],
  },
  {
    id: 'CSH-02',
    area: 'cashflow',
    kind: 'flag',
    severity: 'high',
    title: 'Week where cash may run short',
    description: 'Flags a forecast week whose estimated closing cash balance is below the minimum balance.',
    why: 'Knowing weeks ahead gives time to delay an order, agree supplier terms or arrange financing.',
    thresholds: [
      { key: 'minimumBalance', label: 'Minimum cash balance', unit: 'rm', default: 0, min: -1000000, max: 10000000, step: 100 },
    ],
  },
];

export const RULES_BY_ID: Readonly<Record<RuleId, RuleDef>> = Object.fromEntries(
  RULES.map((r) => [r.id, r]),
) as Record<RuleId, RuleDef>;

/** Fixed (non-editable) stock age groups in days, inclusive upper bounds. */
export const AGE_BUCKETS = [
  { key: '0-30', max: 30 },
  { key: '31-60', max: 60 },
  { key: '61-90', max: 90 },
  { key: '91-180', max: 180 },
  { key: '180+', max: Infinity },
] as const;

export type AgeBucketKey = (typeof AGE_BUCKETS)[number]['key'];

/** Number of weeks in the cash-flow outlook. */
export const FORECAST_WEEKS = 8;
