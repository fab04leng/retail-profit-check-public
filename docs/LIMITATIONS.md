# Known limitations

Retail Profit Check is a **demo and pilot tool**, not a finished product. Its findings are possibilities for a qualified accountant to review. Here is what it does not do (yet), and where it can be wrong.

## Not yet validated
- **The rules have not been reviewed by the partner accountant.** They follow what two accountants said in interviews and common practice. Before the first paid pilot, the ACCA partner should read `src/rules/rules.config.ts` (or the Rules page) and change anything he disagrees with.
- **Accuracy has only been measured on synthetic data.** The demo data was generated to avoid borderline cases, so 0 false positives there says little about real files. Expect more "Not an issue" findings on real exports, especially for SUP-02 (same amount within 7 days) and PRF-03 (thin-margin staples).
- **Demand is not proven.** The objection rehearsal in `research/` is a synthetic simulation, not market evidence.
- **Import layouts:** column auto-detection is based on common header names in English, Malay and Chinese. No real AutoCount, SQL Account, StoreHub or Loyverse export has been tested (see the "unverified" layout presets).

## Accounting simplifications
- **Unit cost** is the current cost from the product list, applied to the whole period (no FIFO, no weighted-average history). If costs changed during the period, profit by product is approximate. Products with cost 0 are treated as "no cost".
- **Sales totals** are taken as net of discount when a Total column exists. **Tax (SST):** when a file has separate before-tax and after-tax amount columns, sales use the before-tax amount and supplier invoices and payments use the after-tax amount (what is paid); a column holding only the tax is never used. When a sales file has only one total and it includes tax, the tax is not separated and revenue is overstated by it.
- **Refunds and voids:** refunds are recognised from negative quantities or amounts, or from a line-type column saying "Refund"/"Return"/"Pulangan"/退货; lines marked "Void"/"Cancelled"/"Batal"/作废 are skipped with a message.
- **Date order:** dates are read day-first (DD/MM/YYYY) unless a column proves month-first (a middle part above 12). When every date in a column could be read either way (for example a file covering only the 1st–12th of a month), the app says so on the Start page; the reading cannot be changed by hand yet.
- **Below cost** is judged on the average selling price over the period, so a short promotion below cost may not show, and a product whose cost rose recently may look worse than it was earlier in the year.
- **Stock age** counts from the last sale. A product that was restocked recently but has not sold for a long time is still flagged as dead stock (on purpose: the restock is the question to ask).
- **Days of cover** uses the average daily units over the look-back period; seasonality is ignored.
- **Duplicate checks** compare invoice numbers ignoring spaces, dashes and case, and totals exact to the sen. Credit notes, partial deliveries and split invoices are not modelled.
- **Payment matching** relies on the payment reference containing the invoice number, or an exact amount. Lump-sum payments for many invoices without references will show as "no matching invoice". Supplier names must match apart from case, punctuation and "Sdn Bhd".
- **Cash-flow outlook** is a straight-line trend through recent weekly sales. It does not know about festivals, school holidays, customer credit, loans, tax payments, or stock purchases beyond the restocking estimate. Without a payments file, invoices due before the forecast start are assumed paid.
- **Multi-currency, multi-company and returns to suppliers** are not supported.

## Technical
- **Browser support:** tested in Chromium (desktop and phone viewports). Safari and Firefox were not tested in this environment.
- **File types:** CSV/TSV/TXT and `.xlsx`/`.xlsm` (first sheet only). Old `.xls`, `.ods`, PDF and scanned receipts are not supported.
- **Size:** up to 60 MB per file and 1,000,000 rows; tested with 100,000 sales rows (about 1.5 s). Very large files are limited by the browser's memory.
- **Storage:** settings, column choices and review notes live in this browser's localStorage only. They do not sync between computers and are lost if browser data is cleared. Review notes are not a substitute for working papers.
- **Offline build** (`dist-offline/`) analyses on the page instead of in a Web Worker, so the page can pause for a second or two on very large files.
- **Accessibility:** keyboard navigation, labels, focus handling and colour-plus-icon status were checked in code review and automated tests; no screen-reader user testing has been done.
- **Light theme only;** no dark mode.
