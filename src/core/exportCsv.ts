/**
 * CSV export with protection against spreadsheet formula injection: a cell that
 * starts with = + - @ tab or carriage return is prefixed with an apostrophe so
 * Excel/Sheets show it as text instead of running it. Plain numbers stay numbers.
 */
const DANGEROUS = /^[=+\-@\t\r]/;

/** Dangerous if the first character — or the first after leading spaces/newlines — starts a formula. */
function isDangerous(s: string): boolean {
  if (/^-?\d+(\.\d+)?$/.test(s)) return false;
  return DANGEROUS.test(s) || DANGEROUS.test(s.replace(/^[\s\u00A0]+/, ''));
}

export function safeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  let s = String(value);
  if (isDangerous(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s) || s !== s.trim()) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: unknown[][]): string {
  return rows.map((r) => r.map(safeCell).join(',')).join('\r\n') + '\r\n';
}

/** Value for an Excel export cell: same guard, but numbers kept as numbers. */
export function safeExcelText(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return isDangerous(s) ? `'${s}` : s;
}
