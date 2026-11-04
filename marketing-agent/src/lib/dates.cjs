/**
 * Malaysia time (MYT, UTC+8, no daylight saving) helpers.
 * Dates in the sheet are written as "YYYY-MM-DD HH:mm" Malaysia time.
 * Plain functions only: inlined into n8n Code nodes by the build.
 */

const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** A Date whose UTC fields show the Malaysia wall-clock time of `date`. */
function toMytWallClock(date) {
  return new Date(date.getTime() + MYT_OFFSET_MS);
}

/** ISO week (Monday start) of an instant, judged in Malaysia time. */
function isoWeekOf(date) {
  const d = toMytWallClock(date);
  const day = d.getUTCDay() || 7;
  const thursday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 4 - day));
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((thursday.getTime() - yearStart) / DAY_MS + 1) / 7);
  return { year: thursday.getUTCFullYear(), week };
}

function weekId(isoWeek) {
  return `${isoWeek.year}-W${pad2(isoWeek.week)}`;
}

/** The ISO week `offset` weeks after the week containing `date`. */
function isoWeekWithOffset(date, offset) {
  return isoWeekOf(new Date(date.getTime() + (offset || 0) * 7 * DAY_MS));
}

/** Monday of an ISO week as a UTC-midnight Date (calendar date only). */
function mondayOfIsoWeek(isoWeek) {
  const jan4 = new Date(Date.UTC(isoWeek.year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  return new Date(jan4.getTime() + ((isoWeek.week - 1) * 7 - (day - 1)) * DAY_MS);
}

/** "2026-11-09 20:30" for weekday name ("Mon") + "HH:mm" in an ISO week. */
function slotDateTime(isoWeek, weekdayName, hhmm) {
  const index = WEEKDAYS.indexOf(String(weekdayName).slice(0, 3));
  if (index < 0) throw new Error(`Unknown weekday "${weekdayName}" in POST_DAYS. Use Mon,Tue,Wed,Thu,Fri,Sat,Sun.`);
  if (!/^\d{1,2}:\d{2}$/.test(String(hhmm))) throw new Error(`POST_TIME must look like 20:30, got "${hhmm}".`);
  const d = new Date(mondayOfIsoWeek(isoWeek).getTime() + index * DAY_MS);
  const [h, m] = String(hhmm).split(':');
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(Number(h))}:${m}`;
}

/** "YYYY-MM-DD HH:mm" in Malaysia time. */
function formatMyt(date) {
  const d = toMytWallClock(date);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

function fromMytParts(y, mo, d, h, mi, s) {
  const ms = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h || 0), Number(mi || 0), Number(s || 0)) - MYT_OFFSET_MS;
  const result = new Date(ms);
  return Number.isNaN(result.getTime()) ? null : result;
}

/**
 * Read a date/time cell as Malaysia time. Accepts what Google Sheets may return:
 * "2026-11-09 20:30", "2026-11-09T20:30:00", "09/11/2026 20:30:00" (day first),
 * an ISO string with Z/offset, or a Sheets serial number. Returns null if empty or unreadable.
 */
function parseMyt(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Sheets serial: days since 1899-12-30, in the sheet's (assumed Malaysia) time zone.
    return new Date(Date.UTC(1899, 11, 30) + value * DAY_MS - MYT_OFFSET_MS);
  }
  const text = String(value).trim();
  if (!text) return null;
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(text) && /\d{4}-\d{2}-\d{2}T/.test(text)) {
    const d = new Date(text);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  let m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) return fromMytParts(m[1], m[2], m[3], m[4], m[5], m[6]);
  m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) return fromMytParts(m[3], m[2], m[1], m[4], m[5], m[6]);
  if (/^\d+(?:\.\d+)?$/.test(text)) return parseMyt(Number(text));
  return null;
}

/* @export-start */
module.exports = { isoWeekOf, weekId, isoWeekWithOffset, mondayOfIsoWeek, slotDateTime, formatMyt, parseMyt, WEEKDAYS, MYT_OFFSET_MS, DAY_MS };
/* @export-end */
