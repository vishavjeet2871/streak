import type { DateKey, Entry, Habit } from '../types';
import { addDays, eachDay, startOfWeek, weekday } from '../utils/dates';
import { entryId, newId } from '../utils/id';
import { seededRandom } from '../utils/random';

interface DemoSpec {
  habit: Omit<Habit, 'startDate' | 'order' | 'archivedAt' | 'createdAt' | 'updatedAt'>;
  daysAgo: number;
  /** Base chance of completing on a given day */
  base: number;
  /** How much better the habit gets from the first to the last day */
  trend: number;
  /** Per-weekday adjustment, Sunday first */
  weekdayBias?: number[];
  /** Force a clean run for the last N days (before today) so there's a streak to admire */
  recentRun?: number;
  /** Value to log today (undefined = not done yet) */
  today?: number;
}

const SPECS: DemoSpec[] = [
  {
    habit: {
      id: 'demo-leetcode',
      name: 'LeetCode problems',
      emoji: '💻',
      color: '#f5a524',
      kind: 'count',
      target: 2,
      unit: 'problems',
      step: 1,
      frequency: { type: 'daily' },
      freezes: true,
    },
    daysAgo: 89,
    base: 0.55,
    trend: 0.3,
    weekdayBias: [-0.2, 0.05, 0.05, 0.05, 0, -0.05, -0.2],
    recentRun: 16,
    today: 1,
  },
  {
    habit: {
      id: 'demo-gym',
      name: 'Gym',
      emoji: '🏋️',
      color: '#3b82f6',
      kind: 'check',
      target: 1,
      unit: '',
      step: 1,
      frequency: { type: 'weekly', times: 4 },
      freezes: true,
    },
    daysAgo: 89,
    base: 0.6,
    trend: 0.1,
    weekdayBias: [-0.3, 0.1, 0.05, 0.1, 0.05, 0, -0.1],
  },
  {
    habit: {
      id: 'demo-sleep',
      name: 'Sleep before 1 AM',
      emoji: '😴',
      color: '#9b6cf6',
      kind: 'check',
      target: 1,
      unit: '',
      step: 1,
      frequency: { type: 'daily' },
      freezes: true,
    },
    daysAgo: 89,
    base: 0.5,
    trend: 0.25,
    weekdayBias: [0.05, 0.05, 0.05, 0.05, 0, -0.3, -0.35],
    recentRun: 9,
  },
  {
    habit: {
      id: 'demo-read',
      name: 'Read 20 min',
      emoji: '📚',
      color: '#22c993',
      kind: 'check',
      target: 1,
      unit: '20 min',
      step: 1,
      frequency: { type: 'daily' },
      freezes: false,
    },
    daysAgo: 75,
    base: 0.65,
    trend: 0.15,
    weekdayBias: [0.1, -0.05, -0.05, 0, -0.05, 0, 0.1],
    recentRun: 23,
    today: 1,
  },
  {
    habit: {
      id: 'demo-water',
      name: 'Drink 3L water',
      emoji: '💧',
      color: '#22b8cf',
      kind: 'count',
      target: 3,
      unit: 'L',
      step: 0.5,
      frequency: { type: 'daily' },
      freezes: true,
    },
    daysAgo: 60,
    base: 0.6,
    trend: 0.2,
    today: 1.5,
  },
  {
    habit: {
      id: 'demo-meditate',
      name: 'Meditate',
      emoji: '🧘',
      color: '#ec4899',
      kind: 'check',
      target: 1,
      unit: '10 min',
      step: 1,
      frequency: { type: 'weekdays', days: [1, 3, 5] },
      freezes: false,
    },
    daysAgo: 45,
    base: 0.7,
    trend: 0.1,
  },
];

/**
 * ~90 days of believable history: habits improve over time, weekends wobble,
 * momentum matters (a done yesterday makes today likelier), and a few habits
 * carry live streaks into today, which is left half-finished to tap through.
 */
export function generateDemoData(
  today: DateKey,
  {
    seed = 7,
    now = Date.now(),
    // Synced IDs must be globally unique, so every demo load gets its own suffix.
    idSuffix = newId().slice(0, 8),
  }: { seed?: number; now?: number; idSuffix?: string } = {},
): { habits: Habit[]; entries: Entry[] } {
  const rand = seededRandom(seed);
  const habits: Habit[] = [];
  const entries: Entry[] = [];

  const log = (habitId: string, date: DateKey, value: number) => {
    if (value > 0) entries.push({ id: entryId(habitId, date), habitId, date, value, updatedAt: now });
  };

  SPECS.forEach((spec, order) => {
    const startDate = addDays(today, -spec.daysAgo);
    const h: Habit = {
      ...spec.habit,
      id: `${spec.habit.id}-${idSuffix}`,
      startDate,
      order,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    habits.push(h);
    const days = eachDay(startDate, addDays(today, -1));
    const runStart = spec.recentRun ? addDays(today, -spec.recentRun) : null;

    if (h.frequency.type === 'weekly') {
      // Pick roughly `times` days per week, favouring weekdays.
      const times = h.frequency.times;
      let week = startOfWeek(startDate);
      while (week <= today) {
        const roll = rand();
        const goal = roll < 0.12 ? times - 1 : roll < 0.9 ? times : times + 1;
        const candidates = eachDay(week, addDays(week, 6))
          .filter((d) => d >= startDate && d < today)
          .map((d) => ({ d, score: rand() + (spec.weekdayBias?.[weekday(d)] ?? 0) }))
          .sort((a, b) => b.score - a.score);
        for (const { d } of candidates.slice(0, goal)) log(h.id, d, 1);
        week = addDays(week, 7);
      }
    } else {
      let doneYesterday = false;
      days.forEach((d, i) => {
        if (h.frequency.type === 'weekdays' && !h.frequency.days.includes(weekday(d))) return;
        const progress = i / Math.max(days.length - 1, 1);
        const p =
          spec.base + spec.trend * progress + (spec.weekdayBias?.[weekday(d)] ?? 0) + (doneYesterday ? 0.08 : -0.06);
        const done = (runStart !== null && d >= runStart) || rand() < p;
        doneYesterday = done;
        if (h.kind === 'check') {
          if (done) log(h.id, d, 1);
        } else if (done) {
          // Hit the target, sometimes overshoot
          log(h.id, d, h.target + (rand() < 0.25 ? h.step : 0));
        } else if (rand() < 0.6) {
          // Partial progress
          const steps = Math.max(1, Math.floor((rand() * h.target) / h.step));
          log(h.id, d, Math.min(steps * h.step, h.target - h.step));
        }
      });
    }

    if (spec.today) log(h.id, today, spec.today);
  });

  return { habits, entries };
}
