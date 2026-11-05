# Retail Profit Check — rule review pack

*For the partner accountant, before the first paid pilot.* Rules version c81bf888 · 15 rules · worked examples from the demo data: Pinangria Mart (fictional demo shop), 2025-11-03 to 2026-11-01

## What the tool does

- Reads a shop's own exports (sales, product/stock list, supplier invoices, optionally payments) inside the browser. Nothing is uploaded.
- Applies the rules in this pack and shows every finding with the rule that fired and the exact source rows.
- Lets an accountant mark each finding Confirmed, Not an issue or Needs info, and prints a one-page owner summary.

## What it does not do

- It is not audited accounts, a review engagement or tax advice, and it does not replace an accountant.
- It does not value stock for the accounts (current cost, no net realisable value), separate SST, or know about rebates, credit notes, loans or tax payments.
- It does not prove that anything is wrong. Every finding is a possibility to check against documents. Accuracy has only been measured on synthetic data.

## How to review

1. For each rule, read the description and the worked example. Row numbers are spreadsheet rows in the demo files in demo/data/ (row 1 = header), so you can open them in Excel and check.
2. Tick Agree, Change to (write the new number or wording) or Remove, and add notes, especially false positives you see in practice. The last page collects your decisions.
3. Sign below. The founder changes src/rules/rules.config.ts and the app's Rules page to match before the first pilot, and gives you the new version number.

## Sign-off

I have read every rule in this pack and recorded my decisions. This is a review of the tool's rules only. It is not an audit, review or other assurance engagement on any business's financial information.

- Name: ______________________________
- Professional body and membership no.: ______________________________
- Firm: ______________________________
- Signature: ______________________________
- Date: ______________________________

---

## PRF-01 — How profit is calculated

*Method (describes a calculation; creates no findings)*

**What it does:** Revenue = sales line totals after discounts, minus refunds (negative quantities). Cost of goods sold = net units sold × unit cost from your product list. Gross profit = revenue − cost. Margin % = gross profit ÷ revenue.

**Why it matters:** Owners often look at sales, not profit. A product can sell a lot and still make little or no money.

**Threshold:** No editable threshold.

### Worked example (demo data)

1. Product DE-009 Telur Ayam Kampung 10 biji: 192 sales lines in the period, including 1 refund line (negative quantity).
2. Revenue = sum of line totals after discount, refunds negative = RM 3,297.50.
3. Net units sold = 265. Unit cost (products row 117) = RM 7.81.
4. Cost of goods sold = 265 × RM 7.81 = RM 2,069.65.
5. Gross profit = RM 3,297.50 − RM 2,069.65 = RM 1,227.85. Margin = RM 1,227.85 ÷ RM 3,297.50 = 37.2%.

**Products — demo/data/products.csv**

| Row | SKU | Product Name | Category | Unit Cost | Quantity On Hand | Last Received Date |
|---|---|---|---|---|---|---|
| 117 | DE-009 | Telur Ayam Kampung 10 biji | Dairy & Eggs | 7.81 | 16 | 29/10/2026 |

**Sales — demo/data/sales.csv**

| Row | Date | Receipt No | SKU | Product Name | Category | Quantity | Unit Price | Discount | Total | Outlet |
|---|---|---|---|---|---|---|---|---|---|---|
| 177 | 04/11/2025 | BL-200048 | DE-009 | Telur Ayam Kampung 10 biji | Dairy & Eggs | 2 | 12.50 | 0.00 | 25.00 | Bayan Lepas |
| 255 | 04/11/2025 | BL-200086 | DE-009 | Telur Ayam Kampung 10 biji | Dairy & Eggs | 3 | 12.50 | 0.00 | 37.50 | Bayan Lepas |
| 830 | 07/11/2025 | BL-200231 | DE-009 | Telur Ayam Kampung 10 biji | Dairy & Eggs | 2 | 12.50 | 0.00 | 25.00 | Bayan Lepas |
| 1897 | 12/11/2025 | BL-200460 | DE-009 | Telur Ayam Kampung 10 biji | Dairy & Eggs | 1 | 12.50 | 0.00 | 12.50 | Bayan Lepas |
| 2232 | 13/11/2025 | JL-100709 | DE-009 | Telur Ayam Kampung 10 biji | Dairy & Eggs | 1 | 12.50 | 1.25 | 11.25 | Jelutong |
| 27919 | 28/02/2026 | RF-220334 | DE-009 | Telur Ayam Kampung 10 biji | Dairy & Eggs | -1 | 12.50 | 0.00 | -12.50 | Bayan Lepas |

Showing 6 of 192 rows. All 192 rows are in evidence/PRF-01-sales.csv, with their row numbers.

### Where the calculation is approximate

- Unit cost is today's cost from the product list, applied to the whole period (no FIFO or weighted-average history). If a cost changed during the year, profit by product is approximate.
- If the POS "Total" column includes SST, revenue is overstated by the tax and margins look better than they are. The tool does not separate SST.
- Supplier rebates, volume incentives, free goods ("10 + 1") and promotion support are not in the product cost, so real margins may be higher.
- Shrinkage, expired and damaged goods are not counted (cost is units sold × unit cost), so real margins may be lower.
- Products with no cost (missing from the product list or cost 0) are left out of margin and listed separately.

### What it can miss

- Profit after operating costs (rent, salaries, utilities): only gross profit is calculated.

### Your decision

**Question for you:** Is this calculation acceptable for an owner-level health check (not for the accounts)?

- [ ] Agree
- [ ] Change the method or wording: ____________________
- [ ] Remove this rule

**Notes:**

> &nbsp;
>
> &nbsp;
>
> &nbsp;

---

## PRF-02 — Product sold below cost

*Check (creates findings) · Severity: High*

**What it does:** Flags a product when its average selling price per unit (after discounts and refunds) is lower than its unit cost in the product list.

**Why it matters:** Every unit sold below cost reduces profit. Common causes: cost went up but the shelf price did not, wrong price in the POS, or a promotion left running.

**Threshold:** No editable threshold.

### Worked example (demo data)

1. Product CT-002 Kopi O Kaw Serbuk 1kg: 567 net units sold for RM 11,453.40 → average selling price RM 20.20 per unit.
2. Unit cost in the product list = RM 21.54. Average price < unit cost → flagged.
3. Amount below cost = cost of goods sold RM 12,213.18 − revenue RM 11,453.40 = RM 759.78.
4. Check before agreeing: the supplier invoices show the cost rose from RM 18.73 (13 Apr 2026) to RM 21.54 (12 May 2026). Sales before the rise were compared with the new cost, so part of this amount is the cost rise, not a pricing mistake.

**Products — demo/data/products.csv**

| Row | SKU | Product Name | Category | Unit Cost | Quantity On Hand | Last Received Date |
|---|---|---|---|---|---|---|
| 80 | CT-002 | Kopi O Kaw Serbuk 1kg | Coffee & Tea | 21.54 | 46 | 26/10/2026 |

**Sales — demo/data/sales.csv**

| Row | Date | Receipt No | SKU | Product Name | Category | Quantity | Unit Price | Discount | Total | Outlet |
|---|---|---|---|---|---|---|---|---|---|---|
| 259 | 04/11/2025 | JL-100061 | CT-002 | Kopi O Kaw Serbuk 1kg | Coffee & Tea | 1 | 20.20 | 0.00 | 20.20 | Jelutong |
| 436 | 05/11/2025 | JL-100119 | CT-002 | Kopi O Kaw Serbuk 1kg | Coffee & Tea | 3 | 20.20 | 0.00 | 60.60 | Jelutong |
| 881 | 07/11/2025 | JL-100268 | CT-002 | Kopi O Kaw Serbuk 1kg | Coffee & Tea | 2 | 20.20 | 0.00 | 40.40 | Jelutong |
| 1153 | 08/11/2025 | JL-100348 | CT-002 | Kopi O Kaw Serbuk 1kg | Coffee & Tea | 1 | 20.20 | 0.00 | 20.20 | Jelutong |
| 36720 | 07/04/2026 | RF-220346 | CT-002 | Kopi O Kaw Serbuk 1kg | Coffee & Tea | -1 | 20.20 | 0.00 | -20.20 | Bayan Lepas |

Showing 5 of 415 rows. All 415 rows are in evidence/PRF-02-sales.csv, with their row numbers.

**Supplier invoices — demo/data/supplier-invoices.csv**

| Row | Supplier | Invoice No | Invoice Date | SKU | Description | Quantity | Unit Price | Total | Due Date |
|---|---|---|---|---|---|---|---|---|---|
| 2692 | Kopisenja Beverage Agency | KB-00384 | 13/04/2026 | CT-002 | Kopi O Kaw Serbuk 1kg | 54 | 18.73 | 1011.42 | 13/05/2026 |
| 3142 | Kopisenja Beverage Agency | KB-00391 | 12/05/2026 | CT-002 | Kopi O Kaw Serbuk 1kg | 36 | 21.54 | 775.44 | 11/06/2026 |

### Known false positives

- The cost in the product list was raised recently, but the whole period's sales are compared with the new cost. Sales made before the rise were not below cost (see the worked example: the supplier raised the price in May).
- Unit of measure mix-up: cost per carton or pack in the product list, selling price per piece in the POS (or the reverse).
- A planned loss leader, or a promotion where the supplier pays back the difference (promotion claim). The claim is not in these files.
- "Buy 1 free 1" or bundle lines recorded with a zero price on the free item.
- Staff purchases at or below cost.
- Supplier rebates that bring the real cost below the invoice cost.

### What it can miss

- A short promotion below cost: the average over the whole period can still be above cost.
- Products missing from the product list (no cost to compare).

### Your decision

**Question for you:** Should "below cost" be judged on the whole period, or on recent months only?

- [ ] Agree
- [ ] Change the method or wording: ____________________
- [ ] Remove this rule

**Notes:**

> &nbsp;
>
> &nbsp;
>
> &nbsp;

---

## PRF-03 — Margin below target

*Check (creates findings) · Severity: Medium*

**What it does:** Flags a product that makes a profit but whose gross margin is below the target margin.

**Why it matters:** Thin-margin products may still be worth selling (traffic builders), but the owner should choose that on purpose.

**Threshold:** 

- Target gross margin: **25%** (can be set from 0% – 90%)

### Worked example (demo data)

1. Product RG-002 Beras Wangi 10kg: revenue RM 30,644.60, gross profit RM 4,485.18 → margin 14.6%.
2. Target margin = 25.0%. 14.6% < 25.0% and the product makes a profit → flagged (not PRF-02).
3. Amount shown = gross profit at target (25.0% × RM 30,644.60) − actual gross profit = RM 3,175.97. This is profit short of target, not a loss.

**Products — demo/data/products.csv**

| Row | SKU | Product Name | Category | Unit Cost | Quantity On Hand | Last Received Date |
|---|---|---|---|---|---|---|
| 3 | RG-002 | Beras Wangi 10kg | Rice & Grains | 31.67 | 55 | 30/10/2026 |

**Sales — demo/data/sales.csv**

| Row | Date | Receipt No | SKU | Product Name | Category | Quantity | Unit Price | Discount | Total | Outlet |
|---|---|---|---|---|---|---|---|---|---|---|
| 57 | 03/11/2025 | BL-200035 | RG-002 | Beras Wangi 10kg | Rice & Grains | 1 | 37.10 | 0.00 | 37.10 | Bayan Lepas |
| 162 | 03/11/2025 | JL-100057 | RG-002 | Beras Wangi 10kg | Rice & Grains | 1 | 37.10 | 0.00 | 37.10 | Jelutong |
| 209 | 04/11/2025 | BL-200061 | RG-002 | Beras Wangi 10kg | Rice & Grains | 1 | 37.10 | 0.00 | 37.10 | Bayan Lepas |
| 214 | 04/11/2025 | BL-200064 | RG-002 | Beras Wangi 10kg | Rice & Grains | 1 | 37.10 | 0.00 | 37.10 | Bayan Lepas |
| 75730 | 26/09/2026 | RF-127532 | RG-002 | Beras Wangi 10kg | Rice & Grains | -1 | 37.10 | 0.00 | -37.10 | Jelutong |

Showing 5 of 744 rows. All 744 rows are in evidence/PRF-03-sales.csv, with their row numbers.

### Known false positives

- Thin-margin staples (rice, sugar, cooking oil, flour, eggs), some of which may be price-controlled; cigarettes, prepaid top-ups and bill payments. Their normal margin is well below a general 25% target.
- Products the owner keeps cheap on purpose to bring customers in.
- Rebates and back margins from the supplier that are not in the product cost.
- The RM amount on the finding is the extra gross profit needed to reach the target, not money lost.

### What it can miss

- Products sold below cost are reported under PRF-02 instead, not here.

### Your decision

**Question for you:** Is one target margin for all products right, or should staples have their own target? (Per-category targets are not supported yet; write the targets you would use.)

- [ ] Agree
- [ ] Change to: ______ % (Target gross margin)
- [ ] Remove this rule

**Notes:**

> &nbsp;
>
> &nbsp;
>
> &nbsp;

---

## STK-01 — Stock value and age

*Method (describes a calculation; creates no findings)*

**What it does:** Stock value = quantity on hand × unit cost. Age = days from the last sale of that product to the analysis date (the latest sale date in the file). If a product never sold in the period, age is counted from its last received date, or from the first date in the sales file. Age groups: 0–30, 31–60, 61–90, 91–180 and over 180 days. Negative quantities on hand count as zero.

**Why it matters:** Money sitting in stock that does not sell cannot pay rent, salaries or suppliers.

**Threshold:** No editable threshold.

### Worked example (demo data)

1. Analysis date = latest sale date in the sales file = 1 Nov 2026.
2. Product SC-011 Cuka Putih 375ml: last sale 26 Oct 2026 (sales row 82467) → age 6 days → group "0-30" days.
3. Stock value = 27 on hand × RM 1.61 = RM 43.47.

**Products — demo/data/products.csv**

| Row | SKU | Product Name | Category | Unit Cost | Quantity On Hand | Last Received Date |
|---|---|---|---|---|---|---|
| 54 | SC-011 | Cuka Putih 375ml | Sauces & Condiments | 1.61 | 27 | 15/10/2026 |

**Sales — demo/data/sales.csv**

| Row | Date | Receipt No | SKU | Product Name | Category | Quantity | Unit Price | Discount | Total | Outlet |
|---|---|---|---|---|---|---|---|---|---|---|
| 82467 | 26/10/2026 | BL-219954 | SC-011 | Cuka Putih 375ml | Sauces & Condiments | 2 | 3.60 | 0.00 | 7.20 | Bayan Lepas |

### Where the calculation is approximate

- "Age" means days since the last sale, not days since the goods were received. It is not the stock ageing an accountant prepares from goods received notes (GRN).
- Stock value is quantity × current unit cost. It is not a year-end valuation (no lower of cost and net realisable value).
- Quantity on hand comes from the POS or stock system and is often wrong without a recent stock-take. Negative quantities count as zero.

### What it can miss

- Stock held at another location that is not in the product list.

### Your decision

**Question for you:** Is "days since last sale" a fair way to show owners where cash is stuck?

- [ ] Agree
- [ ] Change the method or wording: ____________________
- [ ] Remove this rule

**Notes:**

> &nbsp;
>
> &nbsp;
>
> &nbsp;

---

## STK-02 — Dead stock

*Check (creates findings) · Severity: High*

**What it does:** Flags a product with stock on hand and no sale for more than the dead-stock number of days.

**Why it matters:** Dead stock ties up cash and often has to be cleared at a discount. The earlier it is found, the more of its value can be recovered.

**Threshold:** 

- No sale for more than: **90 days** (can be set from 14 days – 365 days)

### Worked example (demo data)

1. Product FS-007 Hamper Tahun Baru Cina Besar: last sale 23 Feb 2026 (sales row 26780). Analysis date 1 Nov 2026 → 251 days without a sale.
2. 251 > 90 days, with 27 on hand → flagged.
3. Stock value = 27 × RM 108.25 = RM 2,922.75.

**Products — demo/data/products.csv**

| Row | SKU | Product Name | Category | Unit Cost | Quantity On Hand | Last Received Date |
|---|---|---|---|---|---|---|
| 240 | FS-007 | Hamper Tahun Baru Cina Besar | Festive | 108.25 | 27 | 13/01/2026 |

**Sales — demo/data/sales.csv**

| Row | Date | Receipt No | SKU | Product Name | Category | Quantity | Unit Price | Discount | Total | Outlet |
|---|---|---|---|---|---|---|---|---|---|---|
| 26780 | 23/02/2026 | JL-108745 | FS-007 | Hamper Tahun Baru Cina Besar | Festive | 1 | 153.30 | 0.00 | 153.30 | Jelutong |

### Known false positives

- Seasonal stock kept for next season: Chinese New Year, Hari Raya, Deepavali, Christmas, back-to-school (the worked example is a CNY hamper).
- The system quantity is wrong: the goods were sold, expired or thrown away but never adjusted, so the "dead stock" may not exist.
- Consignment or sale-or-return stock that belongs to the supplier.
- The item sells under another SKU or barcode, or inside a bundle or hamper.
- Sales through another channel that is not in the sales file (wholesale, online, an outlet whose POS was not exported).
- A product restocked recently that has not sold for a long time is still flagged (on purpose: the restock is the question to ask).

### What it can miss

- Overstocked items that still sell a unit now and then. Days of cover (STK-04) shows those.

### Your decision

**Question for you:** Is 90 days right for a minimart? Should fresh or seasonal categories use a different number?

- [ ] Agree
- [ ] Change to: ______ days (No sale for more than)
- [ ] Remove this rule

**Notes:**

> &nbsp;
>
> &nbsp;
>
> &nbsp;

---

## STK-03 — Slow stock

*Check (creates findings) · Severity: Low*

**What it does:** Flags a product with stock on hand and no sale for more than the slow-stock number of days, but not yet dead stock. The health-check "slow stock" number adds up slow and dead stock.

**Why it matters:** Shows how much cash could be freed by selling down or not reordering slow lines.

**Threshold:** 

- No sale for more than: **60 days** (can be set from 7 days – 365 days)

### Worked example (demo data)

1. Product RG-009 Beras Pulut 2kg: last sale 22 Aug 2026 (sales row 67413). Analysis date 1 Nov 2026 → 71 days without a sale.
2. 71 > 60 days and not more than 90 (dead stock), with 23 on hand → flagged.
3. Stock value = 23 × RM 9.28 = RM 213.44.

**Products — demo/data/products.csv**

| Row | SKU | Product Name | Category | Unit Cost | Quantity On Hand | Last Received Date |
|---|---|---|---|---|---|---|
| 10 | RG-009 | Beras Pulut 2kg | Rice & Grains | 9.28 | 23 | 06/08/2026 |

**Sales — demo/data/sales.csv**

| Row | Date | Receipt No | SKU | Product Name | Category | Quantity | Unit Price | Discount | Total | Outlet |
|---|---|---|---|---|---|---|---|---|---|---|
| 67413 | 22/08/2026 | BL-216320 | RG-009 | Beras Pulut 2kg | Rice & Grains | 1 | 15.00 | 0.00 | 15.00 | Bayan Lepas |

### Known false positives

- Slow-moving lines by nature (kitchenware, small electrical items, hardware), where 60 days between sales is normal.
- The same causes as dead stock: seasonal stock, wrong system quantity, consignment stock, sales under another SKU or channel.

### What it can miss

- Overstock on items that sell often but in small numbers (see days of cover).

### Your decision

**Question for you:** Is 60 days useful as an early warning, or does it create too many findings?

- [ ] Agree
- [ ] Change to: ______ days (No sale for more than)
- [ ] Remove this rule

**Notes:**

> &nbsp;
>
> &nbsp;
>
> &nbsp;

---

## STK-04 — Days of stock cover

*Method (describes a calculation; creates no findings)*

**What it does:** Days of cover = quantity on hand ÷ average units sold per day over the look-back period. Products with no sales in the look-back period show "no recent sales".

**Why it matters:** Tells you how long current stock will last at the recent selling rate, so you can avoid over-ordering.

**Threshold:** 

- Look-back period: **90 days** (can be set from 7 days – 365 days)

### Worked example (demo data)

1. Look-back = 90 days: 4 Aug 2026 to 1 Nov 2026.
2. Product SC-011: 79 net units sold in 53 sales lines → 79 ÷ 90 = 0.88 units per day.
3. Days of cover = 27 on hand ÷ 0.88 = 31 days (rounded).

**Products — demo/data/products.csv**

| Row | SKU | Product Name | Category | Unit Cost | Quantity On Hand | Last Received Date |
|---|---|---|---|---|---|---|
| 54 | SC-011 | Cuka Putih 375ml | Sauces & Condiments | 1.61 | 27 | 15/10/2026 |

**Sales — demo/data/sales.csv**

| Row | Date | Receipt No | SKU | Product Name | Category | Quantity | Unit Price | Discount | Total | Outlet |
|---|---|---|---|---|---|---|---|---|---|---|
| 63218 | 04/08/2026 | BL-215302 | SC-011 | Cuka Putih 375ml | Sauces & Condiments | 1 | 3.60 | 0.00 | 3.60 | Bayan Lepas |
| 63364 | 04/08/2026 | JL-120684 | SC-011 | Cuka Putih 375ml | Sauces & Condiments | 3 | 3.60 | 0.00 | 10.80 | Jelutong |
| 63755 | 06/08/2026 | JL-120806 | SC-011 | Cuka Putih 375ml | Sauces & Condiments | 2 | 3.60 | 0.00 | 7.20 | Jelutong |
| 63789 | 06/08/2026 | JL-120821 | SC-011 | Cuka Putih 375ml | Sauces & Condiments | 3 | 3.60 | 0.00 | 10.80 | Jelutong |
| 63839 | 07/08/2026 | BL-215453 | SC-011 | Cuka Putih 375ml | Sauces & Condiments | 2 | 3.60 | 0.00 | 7.20 | Bayan Lepas |
| 64154 | 08/08/2026 | BL-215544 | SC-011 | Cuka Putih 375ml | Sauces & Condiments | 1 | 3.60 | 0.00 | 3.60 | Bayan Lepas |
| 64240 | 08/08/2026 | JL-120942 | SC-011 | Cuka Putih 375ml | Sauces & Condiments | 3 | 3.60 | 0.00 | 10.80 | Jelutong |
| 64778 | 10/08/2026 | JL-121147 | SC-011 | Cuka Putih 375ml | Sauces & Condiments | 2 | 3.60 | 0.00 | 7.20 | Jelutong |

Showing 8 of 53 rows. All 53 rows are in evidence/STK-04-sales.csv, with their row numbers.

### Where the calculation is approximate

- Seasonality is ignored: a festive peak in the look-back period makes cover look short afterwards; a quiet period makes it look long.
- Days when the item was out of stock lower the average, so cover looks longer than it is.
- For several outlets, stock and sales are added together. One outlet may be out of stock while another is overstocked.

### What it can miss

- Products with no sale in the look-back period show "no recent sales" instead of a number.

### Your decision

**Question for you:** Is a 90-day look-back right, or would 30 or 60 days reflect current selling better?

- [ ] Agree
- [ ] Change to: ______ days (Look-back period)
- [ ] Remove this rule

**Notes:**

> &nbsp;
>
> &nbsp;
>
> &nbsp;

---

## STK-05 — Reorder suggestion for fast movers

*Method (describes a calculation; creates no findings)*

**What it does:** Fast movers are the top 20% of products by units sold in the look-back period. When one has fewer days of cover than the reorder point, the suggested quantity is: average units per day × target days of cover − quantity on hand, rounded up. It is a suggestion to discuss with the supplier, not an order.

**Why it matters:** Running out of a best seller loses sales and customers; topping up only what sells avoids adding to slow stock.

**Threshold:** 

- Suggest a reorder below: **14 days** (can be set from 1 days – 120 days)
- Top up to: **30 days** (can be set from 2 days – 180 days)

### Worked example (demo data)

1. 217 products sold in the look-back; the top 20% by units (44 products) are fast movers. BR-002 Roti Putih Sandwic 600g is number 13.
2. 250 units in 90 days = 2.78 per day. Cover = 22 ÷ 2.78 = 8 days, below the reorder point of 14.
3. Suggested quantity = 2.78 × 30 days − 22 on hand = 62 (rounded up). Cash needed at cost: RM 252.96.

**Products — demo/data/products.csv**

| Row | SKU | Product Name | Category | Unit Cost | Quantity On Hand | Last Received Date |
|---|---|---|---|---|---|---|
| 149 | BR-002 | Roti Putih Sandwic 600g | Bread | 4.08 | 22 | 25/10/2026 |

### Where the calculation is approximate

- "Fast movers" are the top 20% by units, not by value or profit.
- The suggestion ignores supplier lead time, minimum order quantity, carton size and shelf life. The worked example is bread, which cannot be stocked for 30 days.
- It is a suggestion to discuss with the supplier, not an order.

### What it can miss

- Fast movers that are already out of stock and so show no recent sales.

### Your decision

**Question for you:** Is this useful to owners, or should it be removed to keep the report about money at risk?

- [ ] Agree
- [ ] Change to: ______ days (Suggest a reorder below)
- [ ] Change to: ______ days (Top up to)
- [ ] Remove this rule

**Notes:**

> &nbsp;
>
> &nbsp;
>
> &nbsp;

---

## SUP-01 — Possible duplicate invoice (same invoice number)

*Check (creates findings) · Severity: High*

**What it does:** Flags when the same supplier and the same invoice number appear on different dates, or when all the lines of an invoice were entered twice. Invoice numbers are compared ignoring spaces, dashes and upper/lower case (so "INV-0012" = "inv 0012").

**Why it matters:** An invoice keyed in twice is often paid twice. Accountants say these are usually found only at year-end audit.

**Threshold:** No editable threshold.

### Worked example (demo data)

1. Haiwania Pet Supplies, invoice HP-01155: the same number appears on 11 Mar 2026 and 14 Mar 2026 (rows below).
2. Same supplier + same invoice number on different dates → flagged. Amount = total of the extra copy = RM 286.20.

**Supplier invoices — demo/data/supplier-invoices.csv**

| Row | Supplier | Invoice No | Invoice Date | SKU | Description | Quantity | Unit Price | Total | Due Date |
|---|---|---|---|---|---|---|---|---|---|
| 2172 | Haiwania Pet Supplies | HP-01155 | 11/03/2026 | PT-002 | Makanan Kucing Kering 3kg | 6 | 26.78 | 160.68 | 10/04/2026 |
| 2173 | Haiwania Pet Supplies | HP-01155 | 11/03/2026 | PT-003 | Makanan Kucing Tin 400g | 12 | 2.61 | 31.32 | 10/04/2026 |
| 2174 | Haiwania Pet Supplies | HP-01155 | 11/03/2026 | PT-004 | Pasir Kucing 10L | 12 | 7.85 | 94.20 | 10/04/2026 |
| 2204 | Haiwania Pet Supplies | HP-01155 | 14/03/2026 | PT-002 | Makanan Kucing Kering 3kg | 6 | 26.78 | 160.68 | 13/04/2026 |
| 2205 | Haiwania Pet Supplies | HP-01155 | 14/03/2026 | PT-003 | Makanan Kucing Tin 400g | 12 | 2.61 | 31.32 | 13/04/2026 |
| 2206 | Haiwania Pet Supplies | HP-01155 | 14/03/2026 | PT-004 | Pasir Kucing 10L | 12 | 7.85 | 94.20 | 13/04/2026 |

### Known false positives

- The supplier restarts its invoice numbering (each year or month), or several supplier branches use the same numbers.
- Two different companies with nearly the same name are treated as one supplier, because names are compared ignoring case, punctuation and "Sdn Bhd".
- One invoice delivered in parts and recorded on each delivery date under the same invoice number.
- A credit note or debit note keyed in with the original invoice number.
- An export that lists the invoice and its knock-off or payment line together.

### What it can miss

- A copy keyed in with a typing mistake in the invoice number (SUP-02 may catch it if the total is the same).

### Your decision

**Question for you:** In your experience, are re-keyed invoices common enough to keep this as a high-severity check?

- [ ] Agree
- [ ] Change the method or wording: ____________________
- [ ] Remove this rule

**Notes:**

> &nbsp;
>
> &nbsp;
>
> &nbsp;

---

## SUP-02 — Possible duplicate invoice (same amount, close dates)

*Check (creates findings) · Severity: Medium*

**What it does:** Flags two invoices from the same supplier with different invoice numbers but exactly the same total (to the sen), dated within the window of each other.

**Why it matters:** A supplier may re-send an invoice under a new number, or a statement may be keyed in as a new invoice. It may also be a genuine repeat order, so it needs review.

**Threshold:** 

- Within: **7 days** (can be set from 0 days – 60 days)

### Worked example (demo data)

1. Rotimas Bakery Supply: invoice RM/26/0830 (12 Oct 2026) and invoice RM/26/0841 (17 Oct 2026) each total RM 297.66.
2. Different numbers, exactly the same total, 5 days apart (window: 7 days) → flagged.

**Supplier invoices — demo/data/supplier-invoices.csv**

| Row | Supplier | Invoice No | Invoice Date | SKU | Description | Quantity | Unit Price | Total | Due Date |
|---|---|---|---|---|---|---|---|---|---|
| 5654 | Rotimas Bakery Supply | RM/26/0830 | 12/10/2026 | BR-001 | Roti Putih Sandwic 400g | 24 | 3.12 | 74.88 | 26/10/2026 |
| 5655 | Rotimas Bakery Supply | RM/26/0830 | 12/10/2026 | BR-002 | Roti Putih Sandwic 600g | 18 | 4.08 | 73.44 | 26/10/2026 |
| 5656 | Rotimas Bakery Supply | RM/26/0830 | 12/10/2026 | BR-003 | Roti Gandum Penuh 400g | 18 | 3.55 | 63.90 | 26/10/2026 |
| 5657 | Rotimas Bakery Supply | RM/26/0830 | 12/10/2026 | BR-004 | Roti Bun Kaya 4 biji | 18 | 2.20 | 39.60 | 26/10/2026 |
| 5658 | Rotimas Bakery Supply | RM/26/0830 | 12/10/2026 | BR-005 | Kaya Kelapa 250g | 12 | 3.82 | 45.84 | 26/10/2026 |
| 5740 | Rotimas Bakery Supply | RM/26/0841 | 17/10/2026 | BR-001 | Roti Putih Sandwic 400g | 24 | 3.12 | 74.88 | 31/10/2026 |
| 5741 | Rotimas Bakery Supply | RM/26/0841 | 17/10/2026 | BR-002 | Roti Putih Sandwic 600g | 18 | 4.08 | 73.44 | 31/10/2026 |
| 5742 | Rotimas Bakery Supply | RM/26/0841 | 17/10/2026 | BR-003 | Roti Gandum Penuh 400g | 18 | 3.55 | 63.90 | 31/10/2026 |

Showing 8 of 10 rows. All rows: 5654–5658, 5740–5744 (also in evidence/SUP-02-invoices.csv).

### Known false positives

- Genuine repeat orders of the same amount: a standing weekly order (bread, newspapers, ice), or the same fixed order each time.
- Fixed charges that are the same every time: delivery fee, chiller or display rental.

### What it can miss

- A copy whose total differs by a few sen (rounding, SST) or that is dated more than the window apart.

### Your decision

**Question for you:** Is 7 days the right window? Is "exactly the same total" too strict or too loose?

- [ ] Agree
- [ ] Change to: ______ days (Within)
- [ ] Remove this rule

**Notes:**

> &nbsp;
>
> &nbsp;
>
> &nbsp;

---

## SUP-03 — Supplier price increase

*Check (creates findings) · Severity: Medium*

**What it does:** For each supplier and item (SKU, or description if there is no SKU), compares each invoice unit price with the previous unit price from that supplier. Flags increases larger than the threshold.

**Why it matters:** Small price rises are easy to miss and quietly cut margin unless shelf prices are updated or the supplier is challenged.

**Threshold:** 

- Increase larger than: **5%** (can be set from 0% – 100%)

### Worked example (demo data)

1. Kopisenja Beverage Agency, CT-002 Kopi O Kaw Serbuk 1kg: previous unit price RM 18.73 (13 Apr 2026), new unit price RM 21.54 (12 May 2026, invoice KB-00391).
2. Rise = (RM 21.54 − RM 18.73) ÷ RM 18.73 = 15.0%, more than 5.0% → flagged.
3. Extra cost on the newer invoice = price difference × 36 units = RM 101.16.

**Supplier invoices — demo/data/supplier-invoices.csv**

| Row | Supplier | Invoice No | Invoice Date | SKU | Description | Quantity | Unit Price | Total | Due Date |
|---|---|---|---|---|---|---|---|---|---|
| 2692 | Kopisenja Beverage Agency | KB-00384 | 13/04/2026 | CT-002 | Kopi O Kaw Serbuk 1kg | 54 | 18.73 | 1011.42 | 13/05/2026 |
| 3142 | Kopisenja Beverage Agency | KB-00391 | 12/05/2026 | CT-002 | Kopi O Kaw Serbuk 1kg | 36 | 21.54 | 775.44 | 11/06/2026 |

### Known false positives

- The price returns to normal after a promotion: the previous price was a discounted price.
- A different pack size or unit of measure under the same SKU or description (carton vs piece).
- Free goods: a line with "10 + 1" free units lowers that invoice's unit price, so the next normal price looks like a rise.
- SST included on one invoice and not on another.
- Without an SKU, items are matched by description, so two different items with the same description are compared.

### What it can miss

- Lines with no quantity or unit price (only a total) cannot be compared and are skipped.
- Many small rises, each below the threshold.

### Your decision

**Question for you:** Is a 5% rise the right trigger for a minimart?

- [ ] Agree
- [ ] Change to: ______ % (Increase larger than)
- [ ] Remove this rule

**Notes:**

> &nbsp;
>
> &nbsp;
>
> &nbsp;

---

## SUP-04 — Invoice possibly overpaid or paid twice

*Check (creates findings) · Severity: High*

**What it does:** Matches payments to invoices: first by the payment reference containing the invoice number (same supplier), otherwise by the same supplier and exactly the same amount on or after the invoice date (within the matching window). Flags an invoice when the payments matched to it add up to more than the invoice total plus the tolerance. Only runs when a payments file is provided.

**Why it matters:** Overpayments are recoverable from the supplier, but only if someone notices.

**Threshold:** 

- Tolerance: **RM 1** (can be set from RM 0 – RM 100)
- Amount-matching window after invoice date: **120 days** (can be set from 7 days – 365 days)

### Worked example (demo data)

1. Bersihana Household Supply, invoice BH-00663: total of the invoice lines = RM 3,010.86.
2. 2 payments were matched to it (payments rows 344, 361), by the reference containing the invoice number or by the same amount after the invoice date. They add up to RM 6,021.72.
3. RM 6,021.72 − RM 3,010.86 = RM 3,010.86, more than the RM 1.00 tolerance → flagged as possibly paid twice.

**Supplier invoices — demo/data/supplier-invoices.csv**

| Row | Supplier | Invoice No | Invoice Date | SKU | Description | Quantity | Unit Price | Total | Due Date |
|---|---|---|---|---|---|---|---|---|---|
| 2491 | Bersihana Household Supply | BH-00663 | 01/04/2026 | HH-001 | Sabun Basuh Pinggan Limau 900ml | 60 | 3.16 | 189.60 | 16/05/2026 |
| 2492 | Bersihana Household Supply | BH-00663 | 01/04/2026 | HH-002 | Sabun Basuh Pinggan Limau 3.6L | 48 | 10.40 | 499.20 | 16/05/2026 |
| 2493 | Bersihana Household Supply | BH-00663 | 01/04/2026 | HH-003 | Serbuk Pencuci Pakaian 2kg | 24 | 10.12 | 242.88 | 16/05/2026 |
| 2494 | Bersihana Household Supply | BH-00663 | 01/04/2026 | HH-004 | Serbuk Pencuci Pakaian 4kg | 36 | 18.87 | 679.32 | 16/05/2026 |
| 2495 | Bersihana Household Supply | BH-00663 | 01/04/2026 | HH-005 | Cecair Pencuci Pakaian 2L | 30 | 11.29 | 338.70 | 16/05/2026 |
| 2496 | Bersihana Household Supply | BH-00663 | 01/04/2026 | HH-006 | Cecair Pencuci Pakaian 3.8L | 30 | 20.08 | 602.40 | 16/05/2026 |
| 2497 | Bersihana Household Supply | BH-00663 | 01/04/2026 | HH-007 | Pelembut Pakaian 2L | 30 | 7.93 | 237.90 | 16/05/2026 |
| 2498 | Bersihana Household Supply | BH-00663 | 01/04/2026 | HH-008 | Pencuci Lantai Pine 2L | 18 | 5.72 | 102.96 | 16/05/2026 |

Showing 8 of 9 rows. All rows: 2491–2499 (also in evidence/SUP-04-invoices.csv).

**Payments — demo/data/payments.csv**

| Row | Payment Date | Supplier | Amount | Reference |
|---|---|---|---|---|
| 344 | 11/05/2026 | Bersihana Household Supply | 3010.86 | BH-00663 |
| 361 | 20/05/2026 | Bersihana Household Supply | 3010.86 | BH-00663 |

### Known false positives

- One lump-sum payment for several invoices whose reference names only one of them: the whole payment is matched to that invoice, which then looks overpaid.
- The payment includes a deposit or advance for a later order, or other charges (delivery, an old balance).
- A cheque was cancelled or bounced and paid again, but both appear in the payment listing.
- Several invoices from the same supplier with the same amount: amount matching may pick the wrong one.

### What it can miss

- Overpayments smaller than the tolerance.
- Payments to the wrong supplier (see SUP-05).

### Your decision

**Question for you:** Is RM 1 the right tolerance, and is a 120-day matching window reasonable?

- [ ] Agree
- [ ] Change to: ______ RM (Tolerance)
- [ ] Change to: ______ days (Amount-matching window after invoice date)
- [ ] Remove this rule

**Notes:**

> &nbsp;
>
> &nbsp;
>
> &nbsp;

---

## SUP-05 — Payment with no matching invoice

*Check (creates findings) · Severity: Medium*

**What it does:** Flags a payment that could not be matched to any invoice from the same supplier using the matching method in SUP-04. Only runs when a payments file is provided.

**Why it matters:** Could be a deposit, an invoice missing from the file, or a payment to the wrong supplier. All need a document.

**Threshold:** No editable threshold.

### Worked example (demo data)

1. Payment of RM 1,286.40 to Bilisora Dry Seafood on 14 Jul 2026, reference "BS-99871" (payments row 477).
2. No invoice from this supplier has a number in the reference, and no unpaid invoice from this supplier has exactly this amount within 120 days before the payment → flagged.

**Payments — demo/data/payments.csv**

| Row | Payment Date | Supplier | Amount | Reference |
|---|---|---|---|---|
| 477 | 14/07/2026 | Bilisora Dry Seafood | 1286.40 | BS-99871 |

### Known false positives

- Deposits or advance payments (in the demo data: "DEPOSIT HAMPER ORDER", payments row 633).
- Payment for an invoice dated before the start of the invoices file. This is common in the first weeks of the period.
- The invoice has not been entered yet (it arrived late).
- A lump-sum payment for several invoices with no reference and an amount that matches no single invoice.
- The supplier name in the payment file differs from the invoices (bank payee name vs trading name).
- Non-stock payments (rent, utilities) included in the payments file.

### What it can miss

- A payment to the wrong supplier whose amount happens to match one of that supplier's invoices.

### Your decision

**Question for you:** Should payments dated in the first month be ignored, to avoid flagging last period's invoices?

- [ ] Agree
- [ ] Change the method or wording: ____________________
- [ ] Remove this rule

**Notes:**

> &nbsp;
>
> &nbsp;
>
> &nbsp;

---

## CSH-01 — How the 8-week cash outlook is estimated

*Method (describes a calculation; creates no findings)*

**What it does:** Cash in: a straight-line trend (least squares) is drawn through weekly sales of the last complete weeks and extended 8 weeks ahead (never below zero). Cash out: unpaid supplier invoices in the week they are due (overdue ones in week 1; invoices with no due date are due after the default terms), fixed monthly costs you enter on their day of the month, and, if switched on, estimated restocking: forecast sales × your historical cost ratio, paid after the default supplier terms. Weeks run Monday to Sunday. This is an estimate, not a promise.

**Why it matters:** A shop can be profitable and still run short of cash in a particular week, for example when a big supplier payment and rent fall together.

**Threshold:** 

- Weeks of sales used for the trend: **8 weeks** (can be set from 2 weeks – 26 weeks)
- Default supplier terms: **30 days** (can be set from 0 days – 120 days)

### Worked example (demo data)

1. Weekly sales of the last 8 complete weeks (table 1) → straight line: week sales ≈ RM 22,842.07 + RM 620.09 × week number (0 = first week in table 1; the forecast continues the count).
2. Inputs for the demo shop: cash in bank RM 20,000.00; Rent (2 outlets) RM 7,800.00 on day 1; Salaries, EPF & SOCSO RM 9,600.00 on day 7; Utilities & internet RM 1,900.00 on day 15.
3. Unpaid supplier invoices fall in the week they are due. Restocking = forecast sales × cost ratio 69.3%, paid 4 weeks later (default terms 30 days).
4. Closing = opening + sales in − supplier invoices − fixed costs − restocking (table 2).

**Table 1: weekly sales used for the trend**

| Week from | Sales |
|---|---|
| 2026-09-07 | RM 23,929.00 |
| 2026-09-14 | RM 23,528.16 |
| 2026-09-21 | RM 23,359.80 |
| 2026-09-28 | RM 25,002.86 |
| 2026-10-05 | RM 22,978.28 |
| 2026-10-12 | RM 25,709.72 |
| 2026-10-19 | RM 28,466.38 |
| 2026-10-26 | RM 27,124.90 |

**Table 2: 8-week outlook**

| Week from | Opening | Sales in | Supplier invoices | Fixed costs | Restocking | Closing |
|---|---|---|---|---|---|---|
| 2026-11-02 | RM 20,000.00 | RM 27,802.79 | RM 12,890.28 | RM 9,600.00 | RM 0.00 | RM 25,312.51 |
| 2026-11-09 | RM 25,312.51 | RM 28,422.88 | RM 13,402.08 | RM 1,900.00 | RM 0.00 | RM 38,433.31 |
| 2026-11-16 | RM 38,433.31 | RM 29,042.97 | RM 71,625.05 | RM 0.00 | RM 0.00 | −RM 4,148.77 |
| 2026-11-23 | −RM 4,148.77 | RM 29,663.06 | RM 18,110.46 | RM 0.00 | RM 0.00 | RM 7,403.83 |
| 2026-11-30 | RM 7,403.83 | RM 30,283.15 | RM 2,483.76 | RM 7,800.00 | RM 19,270.96 | RM 8,132.26 |
| 2026-12-07 | RM 8,132.26 | RM 30,903.24 | RM 6,395.22 | RM 9,600.00 | RM 19,700.77 | RM 3,339.51 |
| 2026-12-14 | RM 3,339.51 | RM 31,523.33 | RM 1,408.02 | RM 1,900.00 | RM 20,130.57 | RM 11,424.25 |
| 2026-12-21 | RM 11,424.25 | RM 32,143.43 | RM 534.54 | RM 0.00 | RM 20,560.37 | RM 22,472.77 |

### Where the calculation is approximate

- Cash in = sales in the same week. Card and e-wallet settlement delays and credit customers are not modelled.
- A straight-line trend ignores festive peaks (CNY, Hari Raya) and school holidays. Just after a peak the trend can point the wrong way.
- Not included unless entered as fixed monthly costs: loans and hire purchase, income tax instalments (CP204), SST payments, EPF/SOCSO, owner drawings, equipment purchases.
- Restocking is estimated as forecast sales × the historical cost ratio, paid after the default terms. It is rough.
- Without a payments file, invoices due before the forecast start are assumed paid.

### What it can miss

- Anything outside the next 8 weeks.

### Your decision

**Question for you:** Is this method clear and cautious enough to show an owner, with the word "estimate" on it?

- [ ] Agree
- [ ] Change to: ______ weeks (Weeks of sales used for the trend)
- [ ] Change to: ______ days (Default supplier terms)
- [ ] Remove this rule

**Notes:**

> &nbsp;
>
> &nbsp;
>
> &nbsp;

---

## CSH-02 — Week where cash may run short

*Check (creates findings) · Severity: High*

**What it does:** Flags a forecast week whose estimated closing cash balance is below the minimum balance.

**Why it matters:** Knowing weeks ahead gives time to delay an order, agree supplier terms or arrange financing.

**Threshold:** 

- Minimum cash balance: **RM 0** (can be set from RM -1,000,000 – RM 10,000,000)

### Worked example (demo data)

1. Week 3 (16 Nov 2026 – 22 Nov 2026): opening RM 38,433.31 + sales in RM 29,042.97 − supplier invoices due RM 71,625.05 − fixed costs RM 0.00 − restocking RM 0.00 = closing −RM 4,148.77.
2. −RM 4,148.77 is below the minimum balance of RM 0.00 → flagged. Shortfall RM 4,148.77 (an estimate).
3. The supplier invoices due that week are 72 invoice lines (sample below; all rows in the evidence file).

**Supplier invoices — demo/data/supplier-invoices.csv**

| Row | Supplier | Invoice No | Invoice Date | SKU | Description | Quantity | Unit Price | Total | Due Date |
|---|---|---|---|---|---|---|---|---|---|
| 5286 | Wangisari Personal Care | 518892 | 19/09/2026 | PC-001 | Syampu Herba 400ml | 24 | 9.52 | 228.48 | 18/11/2026 |
| 5287 | Wangisari Personal Care | 518892 | 19/09/2026 | PC-003 | Sabun Mandi Cecair 500ml | 24 | 8.51 | 204.24 | 18/11/2026 |
| 5288 | Wangisari Personal Care | 518892 | 19/09/2026 | PC-004 | Sabun Mandi Cecair 1L | 18 | 15.49 | 278.82 | 18/11/2026 |
| 5289 | Wangisari Personal Care | 518892 | 19/09/2026 | PC-005 | Ubat Gigi Herba 150g | 36 | 4.08 | 146.88 | 18/11/2026 |
| 5290 | Wangisari Personal Care | 518892 | 19/09/2026 | PC-006 | Ubat Gigi Herba 2 x 150g | 18 | 8.87 | 159.66 | 18/11/2026 |
| 5291 | Wangisari Personal Care | 518892 | 19/09/2026 | PC-007 | Berus Gigi Lembut 2 batang | 24 | 3.01 | 72.24 | 18/11/2026 |
| 5292 | Wangisari Personal Care | 518892 | 19/09/2026 | PC-008 | Deodoran Roll-on 50ml | 18 | 6.87 | 123.66 | 18/11/2026 |
| 5293 | Wangisari Personal Care | 518892 | 19/09/2026 | PC-010 | Tuala Wanita Siang 16 keping | 24 | 5.74 | 137.76 | 18/11/2026 |

Showing 8 of 72 rows. All 72 rows are in evidence/CSH-02-invoices.csv, with their row numbers.

### Known false positives

- Supplier invoices that were already paid, when the payments file is incomplete or missing: unpaid invoices are overstated and a short week appears that is not real.
- Possible duplicate invoices (SUP-01, SUP-02) that are still unpaid add to the cash going out.
- The opening balance is out of date, or the shop has an overdraft facility. In that case set the minimum balance to minus the overdraft limit.
- Suppliers who in practice accept payment later than the due date in the file.

### What it can miss

- Large payments not in any file (tax, loan repayment, a big festive order not yet invoiced).

### Your decision

**Question for you:** Is RM 0 the right default minimum, or should it be, say, two weeks of fixed costs?

- [ ] Agree
- [ ] Change to: ______ RM (Minimum cash balance)
- [ ] Remove this rule

**Notes:**

> &nbsp;
>
> &nbsp;
>
> &nbsp;

---

## Summary of decisions

Copy your decision for each rule here, so the changes can be made in one go.

| Rule | Title | Current threshold | Agree / Change / Remove | New value or wording |
|---|---|---|---|---|
| PRF-01 | How profit is calculated | — |  |  |
| PRF-02 | Product sold below cost | — |  |  |
| PRF-03 | Margin below target | Target gross margin 25% |  |  |
| STK-01 | Stock value and age | — |  |  |
| STK-02 | Dead stock | No sale for more than 90 days |  |  |
| STK-03 | Slow stock | No sale for more than 60 days |  |  |
| STK-04 | Days of stock cover | Look-back period 90 days |  |  |
| STK-05 | Reorder suggestion for fast movers | Suggest a reorder below 14 days; Top up to 30 days |  |  |
| SUP-01 | Possible duplicate invoice (same invoice number) | — |  |  |
| SUP-02 | Possible duplicate invoice (same amount, close dates) | Within 7 days |  |  |
| SUP-03 | Supplier price increase | Increase larger than 5% |  |  |
| SUP-04 | Invoice possibly overpaid or paid twice | Tolerance RM 1; Amount-matching window after invoice date 120 days |  |  |
| SUP-05 | Payment with no matching invoice | — |  |  |
| CSH-01 | How the 8-week cash outlook is estimated | Weeks of sales used for the trend 8 weeks; Default supplier terms 30 days |  |  |
| CSH-02 | Week where cash may run short | Minimum cash balance RM 0 |  |  |
