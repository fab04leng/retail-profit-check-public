// Regenerates 05-stock-balance-merged-header.xlsx (a messy "stock balance" export with
// title rows, a merged two-row header, numbers stored as text, a blank row, the same SKU
// at two locations, negative stock, a missing and a zero cost, and a Total row).
// Run from the repository root: node tests/fixtures/messy/make-xlsx.mjs
import writeXlsxFile from 'write-excel-file/node';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const d = (y, m, day) => ({ value: new Date(Date.UTC(y, m - 1, day)), type: Date, format: 'dd/mm/yyyy' });
const n = (v) => ({ value: v, type: Number });
const s = (v) => ({ value: v, type: String });
const W = 8;
const blank = Array(W).fill(null);

const data = [
  [{ ...s('Stock Balance Report'), columnSpan: W }, ...blank.slice(1)],
  [{ ...s('As at 31/10/2026 · Kedai Contoh (fictional test shop)'), columnSpan: W }, ...blank.slice(1)],
  blank,
  [{ ...s('Item'), columnSpan: 3 }, null, null, s('Quantity'), { ...s('Cost (RM)'), columnSpan: 2 }, null, s('Last GRN'), null],
  [s('Code'), s('Description'), s('Group'), s('Balance'), s('Unit'), s('Total'), s('Date'), s('Location')],
  [s('RG-002'), s('Beras Wangi 10kg'), s('Rice & Grains'), n(42), n(31.2), n(1310.4), d(2026, 10, 28), s('Jelutong')],
  [s('RG-002'), s('Beras Wangi 10kg'), s('Rice & Grains'), n(18), n(31.2), n(561.6), d(2026, 10, 20), s('Bayan Lepas')],
  [s('CT-002'), s('Kopi O Kaw Serbuk 1kg'), s('Coffee & Tea'), s('1,250'), s('RM 21.54'), s('26,925.00'), s('12/10/2026'), s('Jelutong')],
  blank,
  [s('FS-007'), s('Hamper Tahun Baru Cina Besar'), s('Festive'), n(27), n(108.25), n(2922.75), d(2026, 1, 12), s('Jelutong')],
  [s('HH-015'), s('Tisu Tandas 20 gulung'), s('Household'), n(-3), n(17.75), n(-53.25), d(2026, 10, 30), s('Bayan Lepas')],
  [s('PC-099'), s('Sabun Mandi 3 ketul'), s('Personal Care'), n(40), null, null, d(2026, 9, 2), s('Jelutong')],
  [s('ST-001'), s('Buku Latihan Sekolah 80 muka'), s('Stationery'), n(10), n(0), n(0), d(2026, 1, 5), s('Jelutong')],
  [s('Total'), null, null, n(1384), null, n(31666.25), null, null],
];

await writeXlsxFile(data, { sheet: 'Stock Balance' }).toFile(join(here, '05-stock-balance-merged-header.xlsx'));
console.log('Wrote 05-stock-balance-merged-header.xlsx');
