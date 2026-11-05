# Pilot onboarding guide: what to send and how to export it

*For shop owners who have agreed to a Retail Profit Check pilot. Give it to the owner after the pilot agreement is signed. It takes most owners 30–60 minutes.*

We need **four files** from your own systems. You don't need to clean them up or make them look nice: the raw export is best. If something is hard to get, send what you can and tell us. We will help.

---

## 1. The four files

Use **the same period for every file: 3 to 12 months**, ending as close to today as possible. 12 months is best, because it covers the festive seasons.

| # | File | Needed? | One row per… | Columns we use | Common report names |
|---|---|---|---|---|---|
| 1 | **Sales by item** | Required | item on a receipt (not one row per day) | date, receipt no., item code/SKU, item name, category, quantity, unit price, discount, line total, outlet | "Receipts by item", "Sales detail", "Transaction details", "Item sales listing" |
| 2 | **Product / stock list** | Required | product | item code/SKU, name, category, **unit cost**, **quantity on hand**, last received date (if available) | "Item list", "Stock balance", "Inventory valuation", "Stock item listing" |
| 3 | **Supplier invoices** | Recommended | invoice line (best) or invoice | supplier, invoice no., invoice date, item code, description, quantity, unit price, total, **due date** | "Purchase invoice listing (detail)", "Supplier invoice listing", "Goods received" |
| 4 | **Payments to suppliers** | Optional | payment | payment date, supplier, amount, reference (the invoice number(s) it pays) | "Payment listing", "A/P payment listing", "Supplier payment" |

Good to know:
- **Without file 3** we can't check supplier invoices (duplicates, price rises). **Without file 4** we can't check for overpayments or payments with no invoice, and the cash outlook assumes invoices due before the start date were paid.
- **Supplier invoices with only one row per invoice** (no item lines) still work for the duplicate and payment checks, but not for supplier price rises.
- **Take the product/stock list on the last day of the sales period** if you can, ideally after a stock count. Quantities in the system are often wrong without a recent count, and that affects the dead-stock results.
- **If it is easy, include supplier invoices from 1–2 months before the sales period.** Otherwise payments made early in the period for older invoices show up as "payment with no matching invoice".
- **Several outlets:** one file covering all outlets with an outlet column is best. Separate files per outlet are fine too, if each file name says which outlet it is.
- **File types:** Excel (`.xlsx`) or CSV. Only the **first sheet** of an Excel file is read. **Not** PDF, photos or scans. Old `.xls` files: open them in Excel and use *Save As → Excel Workbook (.xlsx)*.
- Column names in English, Bahasa Melayu or 中文 are all fine. Title rows and "Total" rows at the top or bottom are fine too.

---

## 2. How to export from common systems

> ⚠️ **Unverified.** We have **not yet tested a real export** from any of the systems below. The steps come from the vendors' public help pages, where we could find them, or are our best guess from common menu names. Menus differ between versions and plans. If you can't find a report, **send us a screenshot of your Reports menu** (no customer data in the picture) and we'll guide you, or ask your system vendor for "sales by item / stock balance / purchase invoice listing exported to Excel".

### Loyverse POS (Back Office in a web browser) — unverified
- **Sales (file 1):** *Reports → Receipts*. Set the date range, then *Export*. If you are offered a choice, pick the export **by item** (one row per item), not one row per receipt. Loyverse's help pages mention both kinds of export.
- **Products (file 2):** *Items → Item list → Export*. The file should include **Cost** and **In stock**. In stock appears only if stock tracking is switched on for your items.
- **Supplier invoices (file 3):** Loyverse is a POS and may not hold supplier invoices. If you use its purchase orders (*Inventory management → Purchase orders*), export those. Otherwise send them from your accounting system, or as an Excel list (see "Other systems").
- **Payments (file 4):** usually not in Loyverse. Use your accounting system or an Excel list.

### StoreHub BackOffice — unverified
- **Sales (file 1):** look under *Reports* for a **transactions or sales report with item details** for the date range, then *Export* (CSV). It must have one row per item sold, not one row per day.
- **Products (file 2):** look under *Products* or *Inventory* for an export that includes **cost** and **stock quantity** per product (and per outlet, if you have several).
- **Supplier invoices (file 3):** StoreHub's help pages describe stock exports with *Date, Reference Number, Supplier, Outlet* and item details (for example from purchase orders or stock receiving). Export those for the period. If your supplier invoices are in an accounting system, send them from there instead.
- **Payments (file 4):** from your accounting system or bank (see "Other systems").

### AutoCount Accounting — unverified
AutoCount lets you export most listing reports from the report grid with **Export → Excel**. Choose the **detail** listing where there is one.
- **Sales (file 1):** from AutoCount POS if you use it (a sales or POS **detail** listing by item), otherwise from your POS system.
- **Products (file 2):** *Stock → Stock Balance* (or *Stock Item Listing*) with **Balance Qty** and a **cost** column, as at the last day of the period → Export to Excel.
- **Supplier invoices (file 3):** *Purchase → Purchase Invoice*, then the **detail listing** for the period → Export to Excel. Please include **Creditor Name, Doc. No., Doc. Date, Item Code, Description, Qty, Unit Price, SubTotal and Due Date** if the report offers them.
- **Payments (file 4):** *A/P → Payment* listing for the period → Export to Excel, including the **knock-off** (invoice numbers paid) column if there is one.

### SQL Account — unverified
- **Sales (file 1):** from your POS system (see "Other systems"), unless you record sales by item in SQL Account.
- **Products (file 2):** *Stock → Stock Balance* (or a stock valuation report) as at the last day of the period → Export to Excel, with quantity and cost.
- **Supplier invoices (file 3):** *Supplier → Supplier Invoice* (or *Purchase → Purchase Invoice*) listing for the period, in **detail** → Export to Excel. Doc no., doc date, supplier code and name, item code, description, qty, unit price, amount and due date are all useful.
- **Payments (file 4):** *Supplier → Supplier Payment* listing for the period → Export to Excel, with the description or reference showing which invoices were paid.

### Other systems, or records kept in Excel or on paper
- In your POS or accounting system, look for the report names in the table in section 1, then *Export* or *Excel*. If a report can only be printed or saved as PDF, **tell us before retyping anything**. There is often an export option elsewhere.
- **Supplier invoices kept on paper or in Excel:** a simple Excel list with one row per invoice is enough (supplier, invoice no., invoice date, total, due date). We can send you a blank template.
- **Payments from the bank:** your online banking statement exported to Excel or CSV works if the description shows the supplier and invoice number. **Delete every column and row that is not a supplier payment** before sending (see section 3).

---

## 3. Remove personal data before you send

We don't need any personal details of your customers or staff. **Please delete these columns** (or the whole sheet) before sending:

- customer **name**, **phone number**, **email**, **address**, **IC / MyKad / passport number**
- **membership or loyalty number**, customer ID or customer code (if it points to a person)
- **staff or cashier names** (not needed; delete the column)
- **bank account numbers**, and anything that looks like a **card number**
- free-text **notes or remarks** typed at the till (they often contain names or phone numbers)

**Keep** the columns listed in section 1, including supplier names (we need them to match invoices and payments).

**How, in Excel:**
1. Work on a **copy** of the export and keep your original.
2. Right-click the column letter (for example **C**) → **Delete**. Repeat for each column above.
3. **Unhide everything:** right-click any column letter → *Unhide*, and check for hidden sheets (right-click a sheet tab → *Unhide*). Hidden columns and sheets are still sent.
4. **Delete extra sheets** you don't need to send. Only the first sheet is used, but other sheets would still be sent.
5. Save as `.xlsx` (or `.csv`).

If we find personal data you did not mean to send, we will delete those columns and tell you.

**Sending the files:** use the method agreed in your pilot agreement (for example a password-protected file or an encrypted USB drive). **Send the password separately**, for example by phone call or SMS, not in the same message as the files. Please don't post the files in a group chat.

---

## 4. Checklist: what to send

- [ ] **Sales by item**, from ______ to ______ (3–12 months), all outlets
- [ ] **Product / stock list** with unit cost and quantity on hand, taken on ______ (as close to the last sales date as possible)
- [ ] **Supplier invoices** for the same period (plus 1–2 months before it, if easy), with due dates if available
- [ ] *(Optional)* **Supplier payments** from the start of the period until today
- [ ] Personal data columns deleted (customers, staff, bank accounts, notes); hidden columns and extra sheets checked
- [ ] Files are `.xlsx` or `.csv` (not PDF or photos), with clear names, for example `sales_2026-01_to_2026-06.xlsx`
- [ ] A short note with:
  - which system each file came from, and your outlets
  - anything unusual in the period (renovation, closure, stock count, big promotions, a supplier change)
  - for the 8-week cash outlook: **cash in bank today**, any **overdraft limit**, and **fixed monthly costs** (rent, salaries, EPF/SOCSO, utilities, loan repayments) with the day of the month each is paid
- [ ] Sent by the agreed secure method, with the password sent separately

---

## 5. What happens next

1. We check that every file opens and the columns are recognised, and tell you if anything is missing or unclear.
2. We run the checks. The reviewing accountant then marks each finding *Confirmed*, *Not an issue* or *Needs info*. Some findings will need your answer, for example "Was this a deposit?"
3. Results meeting and written report, on the timeline in your pilot agreement (about 2 weeks from complete files).
4. Your files are deleted when you ask, or at the latest as set out in the pilot agreement, and we confirm in writing.

**Reminder:** the results are possible issues for you and your accountant to check against your documents. They are not audited accounts or tax advice, and we can't promise any particular finding or saving.
