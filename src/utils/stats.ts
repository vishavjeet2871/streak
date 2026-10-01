import type { DateKey, EntryIndex, Habit, ValueMap } from '../types';
import {
  addDays,
  addMonths,
  diffDays,
  eachDay,
  endOfMonth,
  maxKey,
  minKey,
  parseKey,
  startOfWeek,
  weekday,
  WEEKDAY_ORDER,
  WEEKDAY_SHORT,
} from './dates';
import { dayStatus, isActiveOn, isComplete } from './schedule';
import { computeStreak, type StreakInfo } from './streaks';

const EMPTY: ValueMap = new Map();
export const valuesFor = (index: EntryIndex, habitId: string): ValueMap => index.get(habitId) ?? EMPTY;

export interface DayScore {
  date: DateKey;
  /** Sum of per-habit progress (partial count habits contribute fractions) */
  done: number;
  /** Number of habits that counted that day */
  total: number;
  /** done / total, or null when nothing was due */
  rate: number | null;
  /** Habits fully completed */
  completions: number;
}

export function dayScore(habits: readonly Habit[], index: EntryIndex, date: DateKey): DayScore {
  let done = 0;
  let total = 0;
  let completions = 0;
  for (const h of habits) {
    const s = dayStatus(h, valuesFor(index, h.id), date);
    if (!s) continue;
    total++;
    done += s.progress;
    if (s.complete) completions++;
  }
  return { date, done, total, rate: total > 0 ? done / total : null, completions };
}

export function dailyScores(
  habits: readonly Habit[],
  index: EntryIndex,
  start: DateKey,
  end: DateKey,
): DayScore[] {
  return eachDay(start, end).map((d) => dayScore(habits, index, d));
}

/** Aggregate rate across many days, weighting each habit-day equally. */
export function aggregateRate(scores: readonly DayScore[]): number | null {
  let done = 0;
  let total = 0;
  for (const s of scores) {
    done += s.done;
    total += s.total;
  }
  return total > 0 ? done / total : null;
}

/** 0 = nothing / no data, 1–4 = intensity buckets for heatmaps. */
export function rateLevel(rate: number | null): 0 | 1 | 2 | 3 | 4 {
  if (rate === null || rate <= 0) return 0;
  if (rate < 0.4) return 1;
  if (rate < 0.7) return 2;
  if (rate < 1) return 3;
  return 4;
}

/** Trailing moving average over the last `window` days with data. */
export function movingAverage(rates: readonly (number | null)[], window: number): (number | null)[] {
  return rates.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let j = Math.max(0, i - window + 1); j <= i; j++) {
      const r = rates[j];
      if (r !== null) {
        sum += r;
        n++;
      }
    }
    return n > 0 ? sum / n : null;
  });
}

export interface WeekdayStat {
  weekday: number;
  label: string;
  rate: number | null;
  completions: number;
}

/** Completion rate and total completions per weekday, Monday first. */
export function weekdayBreakdown(scores: readonly DayScore[]): WeekdayStat[] {
  const acc = Array.from({ length: 7 }, () => ({ done: 0, total: 0, completions: 0 }));
  for (const s of scores) {
    const a = acc[weekday(s.date)];
    a.done += s.done;
    a.total += s.total;
    a.completions += s.completions;
  }
  return WEEKDAY_ORDER.map((wd) => ({
    weekday: wd,
    label: WEEKDAY_SHORT[wd],
    rate: acc[wd].total > 0 ? acc[wd].done / acc[wd].total : null,
    completions: acc[wd].completions,
  }));
}

/** Best and worst weekday by rate (ignores days with no data). Ties go to the earlier weekday. */
export function bestAndWorst(stats: readonly WeekdayStat[]): { best: WeekdayStat | null; worst: WeekdayStat | null } {
  let best: WeekdayStat | null = null;
  let worst: WeekdayStat | null = null;
  for (const s of stats) {
    if (s.rate === null) continue;
    if (!best || s.rate > best.rate!) best = s;
    if (!worst || s.rate < worst.rate!) worst = s;
  }
  return { best, worst };
}

export interface MonthStat {
  /** YYYY-MM-01 */
  month: DateKey;
  rate: number | null;
  completions: number;
}

export interface HabitSummary {
  habit: Habit;
  streak: StreakInfo;
  /** Share of due habit-days completed, since `rangeStart` (or the habit's start) */
  completionRate: number | null;
  /** Days with the target fully reached (on or off schedule), all time */
  totalCompletions: number;
  monthly: MonthStat[];
}

export function habitSummary(
  habit: Habit,
  values: ValueMap,
  today: DateKey,
  { months = 6, rangeStart }: { months?: number; rangeStart?: DateKey } = {},
): HabitSummary {
  const end = habit.archivedAt ? minKey(today, addDays(habit.archivedAt, -1)) : today;
  // Score only what's needed: the rate window and the monthly-trend window.
  const rateFrom = rangeStart ? maxKey(rangeStart, habit.startDate) : habit.startDate;
  const trendFrom = maxKey(addMonths(today, -(months - 1)), habit.startDate);
  const scoreStart = minKey(rateFrom, trendFrom);
  const scores = scoreStart <= end ? dailyScores([habit], new Map([[habit.id, values]]), scoreStart, end) : [];

  let totalCompletions = 0;
  for (const [date, value] of values) {
    if (isActiveOn(habit, date) && date <= today && isComplete(habit, value)) totalCompletions++;
  }

  const monthly: MonthStat[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const month = addMonths(today, -i);
    const inMonth = scores.filter((s) => s.date >= month && s.date <= endOfMonth(month));
    monthly.push({
      month,
      rate: aggregateRate(inMonth),
      completions: inMonth.reduce((n, s) => n + s.completions, 0),
    });
  }

  return {
    habit,
    streak: computeStreak(habit, values, today),
    completionRate: aggregateRate(scores.filter((s) => s.date >= rateFrom)),
    totalCompletions,
    monthly,
  };
}

export interface PeriodStat {
  start: DateKey;
  end: DateKey;
  rate: number | null;
  completions: number;
  days: DayScore[];
}

export interface WeekComparison {
  thisWeek: PeriodStat;
  /** Last week up to the same weekday, for a fair comparison */
  lastWeek: PeriodStat;
  /** Full days of last week, for the mini chart */
  lastWeekDays: DayScore[];
  thisWeekDays: DayScore[];
  /** Percentage-point change in rate, or null */
  delta: number | null;
}

export function compareWeeks(habits: readonly Habit[], index: EntryIndex, today: DateKey): WeekComparison {
  const thisStart = startOfWeek(today);
  const elapsed = diffDays(today, thisStart);
  const lastStart = addDays(thisStart, -7);

  const period = (start: DateKey, end: DateKey): PeriodStat => {
    const days = dailyScores(habits, index, start, end);
    return { start, end, days, rate: aggregateRate(days), completions: days.reduce((n, s) => n + s.completions, 0) };
  };

  const thisWeek = period(thisStart, today);
  const lastWeek = period(lastStart, addDays(lastStart, elapsed));
  const lastWeekDays = dailyScores(habits, index, lastStart, addDays(lastStart, 6));
  const thisWeekDays = eachDay(thisStart, addDays(thisStart, 6)).map((d) =>
    d <= today ? thisWeek.days.find((s) => s.date === d)! : { date: d, done: 0, total: 0, rate: null, completions: 0 },
  );
  const delta =
    thisWeek.rate !== null && lastWeek.rate !== null ? Math.round((thisWeek.rate - lastWeek.rate) * 100) : null;
  return { thisWeek, lastWeek, lastWeekDays, thisWeekDays, delta };
}

/** Count of days where every due habit was fully completed. */
export function perfectDays(scores: readonly DayScore[]): number {
  return scores.filter((s) => s.total > 0 && s.completions === s.total).length;
}

/** Earliest start date across habits (bounded by today), for "all time" ranges. */
export function earliestStart(habits: readonly Habit[], today: DateKey): DateKey {
  return habits.reduce((min, h) => minKey(min, h.startDate), today);
}

/** Years that have any habit activity, newest first. */
export function yearsWithData(habits: readonly Habit[], today: DateKey): number[] {
  const first = parseKey(maxKey(earliestStart(habits, today), '1970-01-01'))[0];
  const last = parseKey(today)[0];
  const years: number[] = [];
  for (let y = last; y >= first; y--) years.push(y);
  return years;
}

