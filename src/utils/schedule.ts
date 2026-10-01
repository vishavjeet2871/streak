import type { DateKey, Frequency, Habit, ValueMap } from '../types';
import { addDays, eachDay, endOfWeek, startOfWeek, weekday, WEEKDAY_ORDER, WEEKDAY_SHORT } from './dates';

type HabitRules = Pick<Habit, 'frequency' | 'startDate' | 'archivedAt' | 'target'>;

/** Between the start date and the (exclusive) archive date. */
export function isActiveOn(habit: Pick<Habit, 'startDate' | 'archivedAt'>, date: DateKey): boolean {
  return date >= habit.startDate && (habit.archivedAt === null || date < habit.archivedAt);
}

/**
 * Whether the habit is on the calendar for `date`. Weekly-target habits are
 * flexible, so every active day is eligible for them.
 */
export function isScheduledOn(habit: HabitRules, date: DateKey): boolean {
  if (!isActiveOn(habit, date)) return false;
  return habit.frequency.type === 'weekdays' ? habit.frequency.days.includes(weekday(date)) : true;
}

export const isComplete = (habit: Pick<Habit, 'target'>, value: number): boolean =>
  value > 0 && value >= habit.target;

/** Share of the target reached, 0–1. */
export function progressOf(habit: Pick<Habit, 'target'>, value: number): number {
  if (habit.target <= 0) return value > 0 ? 1 : 0;
  return Math.max(0, Math.min(value / habit.target, 1));
}

function activeDaysBetween(habit: HabitRules, start: DateKey, end: DateKey): number {
  return eachDay(start, end).filter((d) => isActiveOn(habit, d)).length;
}

/**
 * Completions a weekly-target habit needs in the week starting `weekStart`.
 * A habit that starts on a Saturday can't be expected to hit "4× per week"
 * in its first two days, so partial weeks are capped by their active days.
 */
export function weeklyRequired(habit: HabitRules, weekStart: DateKey): number {
  if (habit.frequency.type !== 'weekly') return 0;
  return Math.min(habit.frequency.times, activeDaysBetween(habit, weekStart, addDays(weekStart, 6)));
}

/** Completed days in [weekStart, upTo], clipped to the week and the habit's active range. */
export function weekCompletions(
  habit: HabitRules,
  values: ValueMap,
  weekStart: DateKey,
  upTo: DateKey = addDays(weekStart, 6),
): number {
  const end = upTo < addDays(weekStart, 6) ? upTo : addDays(weekStart, 6);
  let count = 0;
  for (const d of eachDay(weekStart, end)) {
    if (isActiveOn(habit, d) && isComplete(habit, values.get(d) ?? 0)) count++;
  }
  return count;
}

export interface WeekProgress {
  done: number;
  required: number;
}

export function weekProgress(habit: HabitRules, values: ValueMap, date: DateKey): WeekProgress {
  const ws = startOfWeek(date);
  return { done: weekCompletions(habit, values, ws), required: weeklyRequired(habit, ws) };
}

export interface DayStatus {
  /** 0–1 share of the target reached */
  progress: number;
  complete: boolean;
}

/**
 * How a habit counts toward `date`'s completion score, or null if it doesn't
 * count that day at all.
 *
 * Fixed-schedule habits count on their scheduled days. A "3× per week" habit
 * counts on days you did it, and on days when skipping is no longer an option
 * (the completions still needed ≥ the days left in the week). Rest days in a
 * flexible plan therefore never drag your daily score down.
 */
export function dayStatus(habit: HabitRules, values: ValueMap, date: DateKey): DayStatus | null {
  if (!isActiveOn(habit, date)) return null;
  const value = values.get(date) ?? 0;
  const complete = isComplete(habit, value);

  if (habit.frequency.type !== 'weekly') {
    return isScheduledOn(habit, date) ? { progress: progressOf(habit, value), complete } : null;
  }

  if (complete) return { progress: 1, complete: true };
  const ws = startOfWeek(date);
  const need = weeklyRequired(habit, ws) - weekCompletions(habit, values, ws, addDays(date, -1));
  if (need <= 0) return null;
  const daysLeft = activeDaysBetween(habit, date, endOfWeek(date));
  return need >= daysLeft ? { progress: progressOf(habit, value), complete: false } : null;
}

/** Human summary of a frequency: "Daily", "Mon, Wed, Fri", "3× a week". */
export function describeFrequency(f: Frequency): string {
  switch (f.type) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return `${f.times}× a week`;
    case 'weekdays': {
      const days = [...f.days].sort((a, b) => WEEKDAY_ORDER.indexOf(a as 0) - WEEKDAY_ORDER.indexOf(b as 0));
      if (days.length === 7) return 'Daily';
      if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
      if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
      return days.map((d) => WEEKDAY_SHORT[d]).join(', ');
    }
  }
}

/** "3 problems", "1.5 L", or the free-text goal for checkbox habits. */
export function describeTarget(habit: Pick<Habit, 'kind' | 'target' | 'unit'>): string {
  if (habit.kind === 'check') return habit.unit.trim();
  return `${formatValue(habit.target)} ${habit.unit}`.trim();
}

export function formatValue(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}
