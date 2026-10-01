import { describe, expect, it } from 'vitest';
import {
  aggregateRate,
  bestAndWorst,
  compareWeeks,
  dailyScores,
  dayScore,
  habitSummary,
  movingAverage,
  perfectDays,
  rateLevel,
  weekdayBreakdown,
} from './stats';
import { eachDay } from './dates';
import { makeHabit, values } from './testHelpers';
import type { EntryIndex } from '../types';

const TODAY = '2026-10-01'; // Thursday

describe('dayScore', () => {
  const read = makeHabit({ id: 'read', startDate: '2026-09-01' });
  const water = makeHabit({ id: 'water', kind: 'count', target: 4, startDate: '2026-09-01' });
  const gym = makeHabit({ id: 'gym', startDate: '2026-09-01', frequency: { type: 'weekdays', days: [1] } });
  const index: EntryIndex = new Map([
    ['read', values(TODAY)],
    ['water', values([TODAY, 2])],
  ]);

  it('averages progress over habits due that day, with partial credit', () => {
    // Gym is Monday-only, so on Thursday only read + water count.
    expect(dayScore([read, water, gym], index, TODAY)).toEqual({
      date: TODAY,
      done: 1.5,
      total: 2,
      rate: 0.75,
      completions: 1,
    });
  });

  it('has a null rate when nothing is due', () => {
    expect(dayScore([gym], index, TODAY).rate).toBeNull();
    expect(dayScore([read], index, '2026-08-01').rate).toBeNull();
  });
});

describe('aggregates', () => {
  it('weights every habit-day equally', () => {
    const scores = [
      { date: 'a', done: 1, total: 1, rate: 1, completions: 1 },
      { date: 'b', done: 1, total: 3, rate: 1 / 3, completions: 1 },
      { date: 'c', done: 0, total: 0, rate: null, completions: 0 },
    ];
    expect(aggregateRate(scores)).toBe(0.5);
    expect(aggregateRate([])).toBeNull();
    expect(perfectDays(scores)).toBe(1);
  });

  it('buckets rates into heat levels', () => {
    expect([null, 0, 0.2, 0.5, 0.8, 1].map(rateLevel)).toEqual([0, 0, 1, 2, 3, 4]);
  });

  it('computes a trailing moving average that skips gaps', () => {
    expect(movingAverage([1, null, 0, 1], 2)).toEqual([1, 1, 0, 0.5]);
  });
});

describe('weekdayBreakdown', () => {
  it('orders Monday first and finds best and worst days', () => {
    const h = makeHabit({ startDate: '2026-09-07' }); // a Monday
    // Two full weeks; done every day except weekends.
    const done = eachDay('2026-09-07', '2026-09-20').filter((d) => !['2026-09-12', '2026-09-13', '2026-09-19', '2026-09-20'].includes(d));
    const index: EntryIndex = new Map([['h1', values(...done)]]);
    const stats = weekdayBreakdown(dailyScores([h], index, '2026-09-07', '2026-09-20'));
    expect(stats.map((s) => s.label)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(stats[0]).toMatchObject({ rate: 1, completions: 2 });
    expect(stats[6]).toMatchObject({ rate: 0, completions: 0 });
    const { best, worst } = bestAndWorst(stats);
    expect(best?.label).toBe('Mon');
    expect(worst?.label).toBe('Sat');
  });
});

describe('compareWeeks', () => {
  it('compares this week so far with the same span last week', () => {
    const h = makeHabit({ startDate: '2026-09-01' });
    // Last week (Sep 21–24): 2 of 4 days. This week (Sep 28–Oct 1): 4 of 4.
    const index: EntryIndex = new Map([
      ['h1', values('2026-09-21', '2026-09-23', '2026-09-26', '2026-09-28', '2026-09-29', '2026-09-30', TODAY)],
    ]);
    const c = compareWeeks([h], index, TODAY);
    expect(c.thisWeek).toMatchObject({ start: '2026-09-28', end: TODAY, rate: 1, completions: 4 });
    expect(c.lastWeek).toMatchObject({ start: '2026-09-21', end: '2026-09-24', rate: 0.5, completions: 2 });
    expect(c.delta).toBe(50);
    expect(c.lastWeekDays).toHaveLength(7);
    expect(c.thisWeekDays).toHaveLength(7);
    expect(c.thisWeekDays[6].rate).toBeNull(); // Sunday hasn't happened yet
  });
});

describe('habitSummary', () => {
  it('reports rate, totals, streaks and monthly trend', () => {
    const h = makeHabit({ startDate: '2026-09-27', frequency: { type: 'weekdays', days: [1, 2, 3, 4, 5] } });
    // Sun Sep 27 is off-schedule but still a completion; Mon–Wed done; today (Thu) open.
    const v = values('2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30');
    const s = habitSummary(h, v, TODAY);
    expect(s.totalCompletions).toBe(4);
    expect(s.completionRate).toBe(0.75); // 3 of 4 scheduled days, today included
    expect(s.streak.current).toBe(3);
    expect(s.monthly).toHaveLength(6);
    expect(s.monthly.at(-1)).toMatchObject({ month: '2026-10-01', rate: 0, completions: 0 });
    expect(s.monthly.at(-2)).toMatchObject({ month: '2026-09-01', rate: 1, completions: 3 });
    expect(s.monthly[0]).toMatchObject({ month: '2026-05-01', rate: null });
  });
});

describe('habitSummary ranges', () => {
  it('limits the completion rate to the chosen range', () => {
    const h = makeHabit({ startDate: '2026-09-01' });
    // Missed all of early September, perfect for the last 7 days.
    const v = values(...eachDay('2026-09-25', TODAY));
    expect(habitSummary(h, v, TODAY).completionRate).toBeCloseTo(7 / 31);
    expect(habitSummary(h, v, TODAY, { rangeStart: '2026-09-25' }).completionRate).toBe(1);
    // A range that starts before the habit is clipped to the start date.
    expect(habitSummary(h, v, TODAY, { rangeStart: '2026-01-01' }).completionRate).toBeCloseTo(7 / 31);
  });
});
