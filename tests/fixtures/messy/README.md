# Messy export fixtures

Five realistic, messy exports (fictional shops and data) used by `tests/unit/messy-files.test.ts` and `e2e/messy.spec.ts`. Each must load without fixing columns by hand, read the right numbers, and explain anything odd with a friendly message and a row number.

| File | Kind | What is messy |
|---|---|---|
| `01-pos-sales-detail-merged-header.csv` | Sales | Report title rows; a merged two-row header (`Item` over `Code`/`Description`, `Amount (RM)` over `Price`/`Disc`/`Net`); date + time; thousands separators (`"1,299.00"`); refunds as a negative quantity and as `(38.90)` with a positive quantity; an impossible date (31/09); blank rows; `Sub Total` and `Grand Total` rows; a "Printed by" footer |
| `02-sales-malay-sst.csv` | Sales | Malay headers; `Jumlah Sebelum SST`, `SST` and `Jumlah Termasuk SST` columns; Malay month names (`3 Mac 2026`, `15 Ogos 2026`) and `12-Apr-26`; a decimal comma (`1,00`); a quantity written as a word (`dua`); a `Jumlah Keseluruhan` row |
| `03-sales-us-dates-refund-type.csv` | Sales | Month-first dates with AM/PM times (`03/14/2026 10:02 AM`, `03/04/2026` = 4 March); `RM` prefixes; `10%` discounts; a `Receipt type` column with `Refund` (positive numbers) and `Void` lines; `(RM 4.50)`; a `TOTAL:` row |
| `04-supplier-invoices-sst.csv` | Supplier invoices | AutoCount-style headers (`Creditor Name`, `Doc. No.`); `Amount excl. SST`, `SST 10%`, `Total incl. SST`; thousands separators; the same invoice re-keyed a week later as `KB 00501` with the supplier in capitals; a credit note in brackets; a supplier price rise; a line with no date; `Grand Total` row |
| `05-stock-balance-merged-header.xlsx` | Products | Excel file with title rows, merged cells across a two-row header (`Item` › `Code`, `Cost (RM)` › `Unit`/`Total`, `Last GRN` › `Date`); numbers stored as text (`"1,250"`, `"RM 21.54"`); one date as text; the same SKU at two locations; negative stock; a missing and a zero cost; blank row; `Total` row |

`make-xlsx.mjs` regenerates the Excel file: `node tests/fixtures/messy/make-xlsx.mjs`.
