import { toCsv } from '../../src/core/exportCsv';
import { generateDemo } from '../../src/demo/generate';

/** Demo sales scaled to `rows` lines (repeating the demo lines), as CSV text. */
export function bigSalesCsv(rows = 100_000): { csv: string; demo: ReturnType<typeof generateDemo> } {
  const demo = generateDemo();
  const [header, ...lines] = demo.tables.sales;
  const out: string[][] = [header!];
  for (let i = 0; out.length <= rows; i++) out.push(lines[i % lines.length]!);
  return { csv: toCsv(out), demo };
}
