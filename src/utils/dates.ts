import type { DateKey } from '../types';

/**
 * All habit logic works on local calendar days (`YYYY-MM-DD`), never on Date
 * instants. Arithmetic converts keys to whole "day numbers" via Date.UTC, so it
 * is immune to the host time zone and to DST transitions. Only `toDateKey` and
 * `todayKey` look at the local clock, and that is exactly where we want the
 * user's time zone (IST, or anything else) to apply.
 */

export const MS_PER_DAY = 86_400_000;
/** Weeks run Monday → Sunday everywhere in the app. */
export const WEEK_STARTS_ON = 1;

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day of an instant. */
export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * The day the user is "living in". With `dayStartHour = 3`, 01:30 on Friday
 * still counts as Thursday, so logging "Sleep before 1 AM" after midnight
 * lands on the right day.
 */
export function todayKey(now: Date = new Date(), dayStartHour = 0): DateKey {
  const key = toDateKey(now);
  return now.getHours() < dayStartHour ? addDays(key, -1) : key;
}

export function parseKey(key: DateKey): [year: number, month: number, day: number] {
  const [y, m, d] = key.split('-').map(Number);
  return [y, m, d];
}

/** Days since 1970-01-01 (can be negative). */
export function toDayNumber(key: DateKey): number {
  const [y, m, d] = parseKey(key);
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

export function fromDayNumber(n: number): DateKey {
  const d = new Date(n * MS_PER_DAY);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return fromDayNumber(toDayNumber(value)) === value;
}

export const addDays = (key: DateKey, n: number): DateKey => fromDayNumber(toDayNumber(key) + n);

/** a − b in days */
export const diffDays = (a: DateKey, b: DateKey): number => toDayNumber(a) - toDayNumber(b);

/** 0 = Sunday … 6 = Saturday */
export function weekday(key: DateKey): number {
  // 1970-01-01 was a Thursday (4).
  return (((toDayNumber(key) + 4) % 7) + 7) % 7;
}

export function startOfWeek(key: DateKey, weekStartsOn = WEEK_STARTS_ON): DateKey {
  return addDays(key, -((weekday(key) - weekStartsOn + 7) % 7));
}

export const endOfWeek = (key: DateKey, weekStartsOn = WEEK_STARTS_ON): DateKey =>
  addDays(startOfWeek(key, weekStartsOn), 6);

/** Inclusive range of days. Empty when end < start. */
export function eachDay(start: DateKey, end: DateKey): DateKey[] {
  const out: DateKey[] = [];
  const a = toDayNumber(start);
  const b = toDayNumber(end);
  for (let n = a; n <= b; n++) out.push(fromDayNumber(n));
  return out;
}

export function startOfMonth(key: DateKey): DateKey {
  const [y, m] = parseKey(key);
  return `${y}-${pad(m)}-01`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function endOfMonth(key: DateKey): DateKey {
  const [y, m] = parseKey(key);
  return `${y}-${pad(m)}-${pad(daysInMonth(y, m))}`;
}

/** First day of the month `n` months away from `key`'s month. */
export function addMonths(key: DateKey, n: number): DateKey {
  const [y, m] = parseKey(key);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}-01`;
}

export const minKey = (a: DateKey, b: DateKey): DateKey => (a < b ? a : b);
export const maxKey = (a: DateKey, b: DateKey): DateKey => (a > b ? a : b);

/** Local-midnight Date for display formatting only. */
export function keyToDate(key: DateKey): Date {
  const [y, m, d] = parseKey(key);
  return new Date(y, m - 1, d);
}

const formatters = new Map<string, Intl.DateTimeFormat>();

export function formatDate(key: DateKey, options: Intl.DateTimeFormatOptions): string {
  const id = JSON.stringify(options);
  let f = formatters.get(id);
  if (!f) {
    f = new Intl.DateTimeFormat(undefined, options);
    formatters.set(id, f);
  }
  return f.format(keyToDate(key));
}

/** Mon-first weekday order used across the UI */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const WEEKDAY_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
export const WEEKDAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
