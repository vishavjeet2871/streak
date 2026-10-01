import type { DateKey, Habit, ValueMap } from '../types';
import { addDays, endOfWeek, eachDay, minKey, startOfWeek, toDayNumber, fromDayNumber } from './dates';
import { isActiveOn, isComplete, isScheduledOn, weekCompletions, weeklyRequired } from './schedule';

type StreakHabit = Pick<Habit, 'frequency' | 'startDate' | 'archivedAt' | 'target' | 'freezes'>;

export interface StreakInfo {
  current: number;
  longest: number;
  /** Day-based for fixed schedules; week-based for "X× per week" habits. */
  unit: 'day' | 'week';
  /** Days (or week starts, for weekly habits) that a freeze rescued. */
  frozen: DateKey[];
  /** The current period (today, or this week) is already done. */
  doneNow: boolean;
  /** The streak breaks unless the current period gets done. */
  atRisk: boolean;
}

/**
 * Streaks respect the habit's schedule:
 *   - daily / specific weekdays: consecutive *scheduled* days completed.
 *     Unscheduled days are skipped entirely; a Mon/Wed/Fri habit survives Tuesday.
 *   - X× per week: consecutive weeks (Mon–Sun) that met the target.
 *
 * The period in progress never breaks a streak: an unfinished today (or this
 * week) just doesn't add to it yet.
 *
 * Freezes (if enabled): one per calendar week. A missed scheduled day is
 * forgiven, keeping the streak alive without adding to it. For weekly habits,
 * a week that ended exactly one completion short is forgiven. Freezes are only
 * spent when there is a streak to protect.
 */
export function computeStreak(habit: StreakHabit, values: ValueMap, today: DateKey): StreakInfo {
  return habit.frequency.type === 'weekly'
    ? weeklyStreak(habit, values, today)
    : dailyStreak(habit, values, today);
}

/** Last day the streak walk should consider. */
function lastDay(habit: StreakHabit, today: DateKey): DateKey {
  return habit.archivedAt ? minKey(today, addDays(habit.archivedAt, -1)) : today;
}

function dailyStreak(habit: StreakHabit, values: ValueMap, today: DateKey): StreakInfo {
  let run = 0;
  let longest = 0;
  let doneNow = false;
  let todayPending = false;
  const frozen: DateKey[] = [];
  const freezeWeeks = new Set<DateKey>();

  const end = toDayNumber(lastDay(habit, today));
  for (let n = toDayNumber(habit.startDate); n <= end; n++) {
    const d = fromDayNumber(n);
    if (!isScheduledOn(habit, d)) continue;

    if (isComplete(habit, values.get(d) ?? 0)) {
      run++;
      longest = Math.max(longest, run);
      if (d === today) doneNow = true;
    } else if (d === today) {
      todayPending = true;
    } else {
      const week = startOfWeek(d);
      if (habit.freezes && run > 0 && !freezeWeeks.has(week)) {
        freezeWeeks.add(week);
        frozen.push(d);
      } else {
        run = 0;
      }
    }
  }

  return {
    current: run,
    longest,
    unit: 'day',
    frozen,
    doneNow,
    atRisk: todayPending && run > 0,
  };
}

function weeklyStreak(habit: StreakHabit, values: ValueMap, today: DateKey): StreakInfo {
  let run = 0;
  let longest = 0;
  let doneNow = false;
  let atRisk = false;
  const frozen: DateKey[] = [];

  const thisWeek = startOfWeek(today);
  const last = startOfWeek(lastDay(habit, today));
  for (let ws = startOfWeek(habit.startDate); ws <= last; ws = addDays(ws, 7)) {
    const required = weeklyRequired(habit, ws);
    if (required === 0) continue;
    const count = weekCompletions(habit, values, ws, today);

    if (count >= required) {
      run++;
      longest = Math.max(longest, run);
      if (ws === thisWeek) doneNow = true;
    } else if (ws === thisWeek) {
      // Still in progress. At risk once every remaining day is needed.
      const daysLeft = eachDay(today, endOfWeek(today)).filter((d) => isActiveOn(habit, d)).length;
      atRisk = run > 0 && required - count >= daysLeft;
    } else if (habit.freezes && run > 0 && count === required - 1) {
      frozen.push(ws);
    } else {
      run = 0;
    }
  }

  return { current: run, longest, unit: 'week', frozen, doneNow, atRisk };
}

export function formatStreak(n: number, unit: StreakInfo['unit']): string {
  if (unit === 'week') return `${n} ${n === 1 ? 'week' : 'weeks'}`;
  return `${n} ${n === 1 ? 'day' : 'days'}`;
}
