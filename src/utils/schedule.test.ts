import { describe, expect, it } from 'vitest';
import { dayStatus, describeFrequency, isActiveOn, isScheduledOn, progressOf, weeklyRequired } from './schedule';
import { makeHabit, values } from './testHelpers';

describe('isScheduledOn', () => {
  it('respects specific weekdays', () => {
    const h = makeHabit({ frequency: { type: 'weekdays', days: [1, 3, 5] } });
    expect(isScheduledOn(h, '2026-09-28')).toBe(true); // Mon
    expect(isScheduledOn(h, '2026-09-29')).toBe(false); // Tue
    expect(isScheduledOn(h, '2026-10-02')).toBe(true); // Fri
  });

  it('respects start and (exclusive) archive dates', () => {
    const h = makeHabit({ startDate: '2026-09-10', archivedAt: '2026-09-20' });
    expect(isActiveOn(h, '2026-09-09')).toBe(false);
    expect(isActiveOn(h, '2026-09-10')).toBe(true);
    expect(isActiveOn(h, '2026-09-19')).toBe(true);
    expect(isActiveOn(h, '2026-09-20')).toBe(false);
  });
});

describe('progressOf', () => {
  it('caps partial progress at 1', () => {
    const h = makeHabit({ kind: 'count', target: 4 });
    expect(progressOf(h, 0)).toBe(0);
    expect(progressOf(h, 1)).toBe(0.25);
    expect(progressOf(h, 6)).toBe(1);
  });
});

describe('weekly-target habits', () => {
  const weekly = makeHabit({ startDate: '2026-09-14', frequency: { type: 'weekly', times: 3 } });

  it('caps the requirement in a partial first week', () => {
    const lateStart = { ...weekly, startDate: '2026-09-26' }; // Saturday
    expect(weeklyRequired(lateStart, '2026-09-21')).toBe(2);
    expect(weeklyRequired(lateStart, '2026-09-28')).toBe(3);
  });

  it('only counts a day once skipping is no longer possible', () => {
    const v = values(); // nothing done in the week of Sep 21
    expect(dayStatus(weekly, v, '2026-09-21')).toBeNull(); // Mon: 3 needed, 7 days left
    expect(dayStatus(weekly, v, '2026-09-24')).toBeNull(); // Thu: 3 needed, 4 left
    expect(dayStatus(weekly, v, '2026-09-25')).toEqual({ progress: 0, complete: false }); // Fri: 3 needed, 3 left
  });

  it('counts completed days and drops the rest once the quota is met', () => {
    const v = values('2026-09-14', '2026-09-15', '2026-09-16');
    expect(dayStatus(weekly, v, '2026-09-14')).toEqual({ progress: 1, complete: true });
    expect(dayStatus(weekly, v, '2026-09-17')).toBeNull();
    expect(dayStatus(weekly, v, '2026-09-20')).toBeNull();
  });

  it('treats mid-week rest days as optional', () => {
    const v = values('2026-09-28', '2026-09-29');
    expect(dayStatus(weekly, v, '2026-09-30')).toBeNull();
  });
});

describe('describeFrequency', () => {
  it('summarizes schedules', () => {
    expect(describeFrequency({ type: 'daily' })).toBe('Daily');
    expect(describeFrequency({ type: 'weekly', times: 3 })).toBe('3× a week');
    expect(describeFrequency({ type: 'weekdays', days: [5, 1, 3] })).toBe('Mon, Wed, Fri');
    expect(describeFrequency({ type: 'weekdays', days: [1, 2, 3, 4, 5] })).toBe('Weekdays');
    expect(describeFrequency({ type: 'weekdays', days: [0, 6] })).toBe('Weekends');
  });
});
