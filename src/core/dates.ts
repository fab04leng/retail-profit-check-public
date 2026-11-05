/**
 * Date parsing for Malaysian retail exports. Output is always ISO `YYYY-MM-DD`.
 * Day-first (DD/MM/YYYY) is the default, as used in Malaysia; a column is read
 * month-first only if its values prove it (a middle part above 12).
 */

export type DateOrder = 'DMY' | 'MDY';

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, januari: 1,
  feb: 2, february: 2, februari: 2,
  mar: 3, march: 3, mac: 3,
  apr: 4, april: 4,
  may: 5, mei: 5,
  jun: 6, june: 6,
  jul: 7, july: 7, julai: 7,
  aug: 8, august: 8, ogos: 8, ogo: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, okt: 10, oktober: 10,
  nov: 11, november: 11,
  dec: 12, december: 12, dis: 12, disember: 12,
};

const MS_PER_DAY = 86_400_000;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function isValidYMD(y: number, m: number, d: number): boolean {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1) return false;
  return d <= daysInMonth(y, m);
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function toISO(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function fullYear(y: number, raw: string): number {
  if (raw.length <= 2) return y + 2000; // 26 → 2026
  return y;
}

/** Excel serial date (1900 system) → ISO. Valid for 1955–2119. */
export function excelSerialToISO(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 20000 || serial > 80000) return null;
  const ms = Math.round((serial - 25569) * MS_PER_DAY);
  const d = new Date(ms);
  return toISO(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Look at a column's text values to decide day-first or month-first. */
export function detectDateOrder(values: Iterable<unknown>): DateOrder {
  let dmyEvidence = 0;
  let mdyEvidence = 0;
  for (const v of values) {
    if (typeof v !== 'string') continue;
    const m = v.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
    if (!m) continue;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a > 12 && b <= 12) dmyEvidence++;
    else if (b > 12 && a <= 12) mdyEvidence++;
  }
  return mdyEvidence > 0 && dmyEvidence === 0 ? 'MDY' : 'DMY';
}

/** Parse many date shapes. Returns ISO date or null. */
export function parseDate(value: unknown, order: DateOrder = 'DMY'): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    // Spreadsheet libraries give dates as UTC midnight.
    return toISO(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }
  if (typeof value === 'number') return excelSerialToISO(value);
  if (typeof value !== 'string') return null;
  let s = value.trim();
  if (!s) return null;
  s = s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));

  let m: RegExpMatchArray | null;
  // 2026年1月12日
  if ((m = s.match(/^(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?/))) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return isValidYMD(y, mo, d) ? toISO(y, mo, d) : null;
  }
  // ISO / YYYY/MM/DD (optionally followed by time)
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/))) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return isValidYMD(y, mo, d) ? toISO(y, mo, d) : null;
  }
  // DD/MM/YYYY, DD-MM-YY, DD.MM.YYYY (optionally followed by time)
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:[T\s,].*)?$/))) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const y = fullYear(Number(m[3]), m[3] ?? '');
    const [d, mo] = order === 'DMY' ? [a, b] : [b, a];
    return isValidYMD(y, mo, d) ? toISO(y, mo, d) : null;
  }
  // 12 Jan 2026, 12-Jan-26, 12 Mac 2026
  if ((m = s.match(/^(\d{1,2})[\s\-/.]+([A-Za-z]{3,9})\.?[\s\-/.,]+(\d{2}|\d{4})(?:\s.*)?$/))) {
    const mo = MONTHS[(m[2] ?? '').toLowerCase()];
    const y = fullYear(Number(m[3]), m[3] ?? '');
    const d = Number(m[1]);
    return mo && isValidYMD(y, mo, d) ? toISO(y, mo, d) : null;
  }
  // Jan 12, 2026
  if ((m = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})(?:\s.*)?$/))) {
    const mo = MONTHS[(m[1] ?? '').toLowerCase()];
    const d = Number(m[2]);
    const y = Number(m[3]);
    return mo && isValidYMD(y, mo, d) ? toISO(y, mo, d) : null;
  }
  // Pure number in a text cell: Excel serial
  if (/^\d{5}(\.\d+)?$/.test(s)) return excelSerialToISO(Number(s));
  return null;
}

/** Days since 1970-01-01 for an ISO date. */
export function dayNumber(iso: string): number {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

export function fromDayNumber(n: number): string {
  const d = new Date(n * MS_PER_DAY);
  return toISO(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function addDays(iso: string, days: number): string {
  return fromDayNumber(dayNumber(iso) + days);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return dayNumber(toIso) - dayNumber(fromIso);
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayMon0(iso: string): number {
  // 1970-01-01 was a Thursday (index 3 with Monday = 0).
  return (((dayNumber(iso) + 3) % 7) + 7) % 7;
}

/** Monday of the week containing `iso`. */
export function mondayOf(iso: string): string {
  return addDays(iso, -weekdayMon0(iso));
}

export function maxISO(a: string, b: string): string {
  return a > b ? a : b;
}
export function minISO(a: string, b: string): string {
  return a < b ? a : b;
}
