import { describe, expect, it } from 'vitest';
import { generateDemoData } from '../db/demo';
import { addDays, isDateKey } from './dates';
import { computeStreak } from './streaks';

const TODAY = '2026-10-01';

describe('demo data', () => {
  const { habits, entries } = generateDemoData(TODAY, { now: 0 });

  it('spans about 90 days and never logs the future', () => {
    expect(habits.map((h) => h.startDate).sort()[0]).toBe(addDays(TODAY, -89));
    expect(entries.every((e) => isDateKey(e.date) && e.date <= TODAY)).toBe(true);
    expect(entries.length).toBeGreaterThan(300);
  });

  it('has unique entry ids that match their habit and date', () => {
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
    expect(entries.every((e) => e.id === `${e.habitId}:${e.date}` && e.value > 0)).toBe(true);
  });

  it('is deterministic and leaves live streaks to show off', () => {
    expect(generateDemoData(TODAY, { now: 0 })).toEqual(generateDemoData(TODAY, { now: 0 }));
    const values = (id: string) => new Map(entries.filter((e) => e.habitId === id).map((e) => [e.date, e.value]));
    const read = habits.find((h) => h.id === 'demo-read')!;
    expect(computeStreak(read, values(read.id), TODAY).current).toBeGreaterThanOrEqual(20);
  });
});
