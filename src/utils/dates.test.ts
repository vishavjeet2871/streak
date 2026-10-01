import { afterEach, describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  diffDays,
  eachDay,
  endOfMonth,
  fromDayNumber,
  isDateKey,
  startOfWeek,
  toDateKey,
  toDayNumber,
  todayKey,
  weekday,
} from './dates';

describe('day arithmetic', () => {
  it('round-trips day numbers', () => {
    expect(toDayNumber('1970-01-01')).toBe(0);
    for (const key of ['1969-12-31', '2024-02-29', '2026-10-01', '2099-12-31']) {
      expect(fromDayNumber(toDayNumber(key))).toBe(key);
    }
  });

  it('adds days across month, year and leap-day boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(diffDays('2026-10-01', '2026-01-01')).toBe(273);
  });

  it('knows weekdays (0 = Sunday)', () => {
    expect(weekday('2026-10-01')).toBe(4); // Thursday
    expect(weekday('2026-10-04')).toBe(0); // Sunday
    expect(weekday('1969-12-31')).toBe(3); // before the epoch
  });

  it('starts weeks on Monday', () => {
    expect(startOfWeek('2026-10-01')).toBe('2026-09-28');
    expect(startOfWeek('2026-09-28')).toBe('2026-09-28');
    expect(startOfWeek('2026-10-04')).toBe('2026-09-28'); // Sunday belongs to the week before
    expect(startOfWeek('2026-10-04', 0)).toBe('2026-10-04');
  });

  it('handles month helpers', () => {
    expect(endOfMonth('2024-02-10')).toBe('2024-02-29');
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-01');
    expect(addMonths('2026-11-30', 2)).toBe('2027-01-01');
  });

  it('validates keys strictly', () => {
    expect(isDateKey('2026-10-01')).toBe(true);
    expect(isDateKey('2026-02-30')).toBe(false);
    expect(isDateKey('2026-1-01')).toBe(false);
    expect(isDateKey(20261001)).toBe(false);
    expect(isDateKey(null)).toBe(false);
  });

  it('lists inclusive ranges', () => {
    expect(eachDay('2026-09-29', '2026-10-02')).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
    expect(eachDay('2026-10-02', '2026-10-01')).toEqual([]);
  });
});

describe('local day boundaries in IST (UTC+05:30)', () => {
  it('runs in Asia/Kolkata', () => {
    expect(new Date('2026-10-01T00:00:00Z').getTimezoneOffset()).toBe(-330);
  });

  it('rolls over at local midnight, not UTC midnight', () => {
    // 23:59:59 IST on Oct 1
    expect(toDateKey(new Date('2026-10-01T18:29:59Z'))).toBe('2026-10-01');
    // 00:00 IST on Oct 2, while it is still Oct 1 in UTC
    expect(toDateKey(new Date('2026-10-01T18:30:00Z'))).toBe('2026-10-02');
    // 05:00 IST on Oct 2 is 23:30 UTC on Oct 1
    expect(todayKey(new Date('2026-10-01T23:30:00Z'))).toBe('2026-10-02');
  });

  it('lets late nights count toward the previous day with dayStartHour', () => {
    const at0130 = new Date('2026-10-01T20:00:00Z'); // 01:30 IST, Oct 2
    expect(todayKey(at0130, 0)).toBe('2026-10-02');
    expect(todayKey(at0130, 3)).toBe('2026-10-01');
    const at0300 = new Date('2026-10-01T21:30:00Z'); // 03:00 IST, Oct 2
    expect(todayKey(at0300, 3)).toBe('2026-10-02');
  });

  it('crosses a year boundary with dayStartHour', () => {
    const newYear0100 = new Date('2026-12-31T19:30:00Z'); // 01:00 IST, Jan 1 2027
    expect(todayKey(newYear0100, 0)).toBe('2027-01-01');
    expect(todayKey(newYear0100, 2)).toBe('2026-12-31');
  });
});

describe('time zones with daylight saving', () => {
  const original = process.env.TZ;
  afterEach(() => {
    process.env.TZ = original;
  });

  it('day math is unaffected by DST transitions', () => {
    process.env.TZ = 'America/New_York';
    // DST began 2026-03-08 in New York: that day is only 23 hours long.
    expect(eachDay('2026-03-07', '2026-03-09')).toHaveLength(3);
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(toDateKey(new Date(2026, 2, 8, 23, 30))).toBe('2026-03-08');
    expect(todayKey(new Date(2026, 2, 9, 1, 0), 2)).toBe('2026-03-08');
  });
});
