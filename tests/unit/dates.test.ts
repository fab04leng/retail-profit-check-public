import { describe, expect, it } from 'vitest';
import { addDays, dayNumber, detectDateOrder, fromDayNumber, mondayOf, parseDate, weekdayMon0 } from '../../src/core/dates';

describe('parseDate', () => {
  it.each([
    ['2026-01-12', '2026-01-12'],
    ['2026/1/2', '2026-01-02'],
    ['2026-01-12T10:22:00', '2026-01-12'],
    ['12/01/2026', '2026-01-12'],
    ['12-01-2026', '2026-01-12'],
    ['12.01.2026', '2026-01-12'],
    ['1/2/26', '2026-02-01'],
    ['12/01/2026 14:35', '2026-01-12'],
    ['12 Jan 2026', '2026-01-12'],
    ['12-Jan-26', '2026-01-12'],
    ['5 Mac 2026', '2026-03-05'],
    ['5 Ogos 2026', '2026-08-05'],
    ['31 Dis 2025', '2025-12-31'],
    ['Jan 12, 2026', '2026-01-12'],
    ['2026年1月12日', '2026-01-12'],
    ['46034', '2026-01-12'],
  ])('parses %s', (input, expected) => {
    expect(parseDate(input)).toBe(expected);
  });

  it('reads Excel serial numbers and Date objects', () => {
    expect(parseDate(46034)).toBe('2026-01-12');
    expect(parseDate(new Date(Date.UTC(2026, 0, 12)))).toBe('2026-01-12');
  });

  it('uses month-first only when told', () => {
    expect(parseDate('01/12/2026', 'MDY')).toBe('2026-01-12');
    expect(parseDate('01/12/2026', 'DMY')).toBe('2026-12-01');
  });

  it.each([['31/02/2026'], ['2026-13-01'], ['hello'], [''], ['32/01/2026'], [null], [12], [new Date('x')]])('rejects %s', (input) => {
    expect(parseDate(input)).toBeNull();
  });

  it('handles leap years', () => {
    expect(parseDate('29/02/2028')).toBe('2028-02-29');
    expect(parseDate('29/02/2026')).toBeNull();
  });
});

describe('detectDateOrder', () => {
  it('defaults to day-first (Malaysia)', () => {
    expect(detectDateOrder(['01/02/2026', '03/04/2026'])).toBe('DMY');
  });
  it('detects month-first from evidence', () => {
    expect(detectDateOrder(['01/02/2026', '03/25/2026'])).toBe('MDY');
  });
  it('stays day-first when evidence conflicts', () => {
    expect(detectDateOrder(['25/03/2026', '03/25/2026'])).toBe('DMY');
  });
});

describe('date arithmetic', () => {
  it('round-trips day numbers', () => {
    expect(fromDayNumber(dayNumber('2026-11-04'))).toBe('2026-11-04');
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
  });
  it('finds weekdays and Mondays', () => {
    expect(weekdayMon0('2026-11-02')).toBe(0); // Monday
    expect(weekdayMon0('2026-11-08')).toBe(6); // Sunday
    expect(mondayOf('2026-11-08')).toBe('2026-11-02');
    expect(mondayOf('2026-11-02')).toBe('2026-11-02');
  });
});
