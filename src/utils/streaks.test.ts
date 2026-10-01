import { describe, expect, it } from 'vitest';
import { computeStreak } from './streaks';
import { addDays, eachDay, todayKey } from './dates';
import { makeHabit, values } from './testHelpers';

const TODAY = '2026-10-01'; // Thursday; its week starts Mon 2026-09-28
const every = (start: string, end: string, except: string[] = []) =>
  values(...eachDay(start, end).filter((d) => !except.includes(d)));

describe('daily habits', () => {
  const daily = makeHabit({ startDate: '2026-09-01' });

  it('counts consecutive days through today', () => {
    const s = computeStreak(daily, every('2026-09-27', TODAY), TODAY);
    expect(s).toMatchObject({ current: 5, longest: 5, unit: 'day', doneNow: true, atRisk: false });
  });

  it('does not break while today is still open', () => {
    const s = computeStreak(daily, every('2026-09-28', '2026-09-30'), TODAY);
    expect(s).toMatchObject({ current: 3, doneNow: false, atRisk: true });
  });

  it('resets after a missed day and remembers the longest run', () => {
    const s = computeStreak(daily, values('2026-09-27', '2026-09-28', TODAY), TODAY);
    expect(s.current).toBe(1);
    expect(s.longest).toBe(2);
  });

  it('is zero with no data, and before the habit starts', () => {
    expect(computeStreak(daily, values(), TODAY)).toMatchObject({ current: 0, longest: 0, atRisk: false });
    const future = makeHabit({ startDate: '2026-10-05' });
    expect(computeStreak(future, values(TODAY), TODAY)).toMatchObject({ current: 0, longest: 0 });
  });

  it('ignores entries before the start date', () => {
    const h = makeHabit({ startDate: '2026-09-30' });
    expect(computeStreak(h, every('2026-09-20', TODAY), TODAY).current).toBe(2);
  });

  it('stops at the archive date', () => {
    const h = makeHabit({ startDate: '2026-09-01', archivedAt: '2026-09-30' });
    const s = computeStreak(h, every('2026-09-25', '2026-09-29'), TODAY);
    expect(s).toMatchObject({ current: 5, atRisk: false });
  });
});

describe('specific weekdays (Mon/Wed/Fri)', () => {
  const mwf = makeHabit({ startDate: '2026-09-14', frequency: { type: 'weekdays', days: [1, 3, 5] } });
  const scheduled = [
    '2026-09-14',
    '2026-09-16',
    '2026-09-18',
    '2026-09-21',
    '2026-09-23',
    '2026-09-25',
    '2026-09-28',
    '2026-09-30',
  ];

  it('skips unscheduled days instead of breaking on them', () => {
    // Today is Thursday, an off day: the streak stands and is not at risk.
    const s = computeStreak(mwf, values(...scheduled), TODAY);
    expect(s).toMatchObject({ current: 8, longest: 8, doneNow: false, atRisk: false });
  });

  it('breaks on a missed scheduled day', () => {
    const s = computeStreak(mwf, values(...scheduled.filter((d) => d !== '2026-09-23')), TODAY);
    expect(s.current).toBe(3);
    expect(s.longest).toBe(4);
  });

  it('does not count completions on off days', () => {
    const s = computeStreak(mwf, values(...scheduled, '2026-09-29', TODAY), TODAY);
    expect(s.current).toBe(8);
  });

  it('is at risk on a scheduled day that is not done yet', () => {
    expect(computeStreak(mwf, values(...scheduled), '2026-10-02').atRisk).toBe(true);
  });
});

describe('streak freezes', () => {
  const daily = makeHabit({ startDate: '2026-09-01', freezes: true });

  it('forgives one miss per week without adding to the streak', () => {
    const s = computeStreak(daily, every('2026-09-01', TODAY, ['2026-09-29']), TODAY);
    expect(s.current).toBe(30);
    expect(s.frozen).toEqual(['2026-09-29']);
  });

  it('has no effect when freezes are off', () => {
    const s = computeStreak({ ...daily, freezes: false }, every('2026-09-01', TODAY, ['2026-09-29']), TODAY);
    expect(s.current).toBe(2);
    expect(s.longest).toBe(28);
    expect(s.frozen).toEqual([]);
  });

  it('allows only one freeze per Monday–Sunday week', () => {
    const s = computeStreak(daily, every('2026-09-01', TODAY, ['2026-09-29', '2026-09-30']), TODAY);
    expect(s.current).toBe(1);
    expect(s.frozen).toEqual(['2026-09-29']);
  });

  it('allows freezes in consecutive weeks', () => {
    // Sunday Sep 27 belongs to the week of Sep 21; Tuesday Sep 29 to the week of Sep 28.
    const s = computeStreak(daily, every('2026-09-01', TODAY, ['2026-09-27', '2026-09-29']), TODAY);
    expect(s.current).toBe(29);
    expect(s.frozen).toEqual(['2026-09-27', '2026-09-29']);
  });

  it('does not spend a freeze when there is no streak to protect', () => {
    const h = { ...daily, startDate: '2026-09-28' };
    // Missed Monday (no streak yet), did Tuesday, missed Wednesday (freeze), did today.
    const s = computeStreak(h, values('2026-09-29', TODAY), TODAY);
    expect(s.frozen).toEqual(['2026-09-30']);
    expect(s.current).toBe(2);
  });
});

describe('count habits', () => {
  it('needs the full target for a day to count', () => {
    const h = makeHabit({ kind: 'count', target: 3, startDate: '2026-09-29' });
    const s = computeStreak(h, values(['2026-09-29', 3], ['2026-09-30', 2], [TODAY, 4]), TODAY);
    expect(s.current).toBe(1);
    expect(s.longest).toBe(1);
  });

  it('accepts fractional targets', () => {
    const h = makeHabit({ kind: 'count', target: 1.5, step: 0.5, startDate: '2026-09-30' });
    expect(computeStreak(h, values(['2026-09-30', 1.5], [TODAY, 1]), TODAY)).toMatchObject({
      current: 1,
      atRisk: true,
    });
  });
});

describe('X times per week', () => {
  const weekly = makeHabit({ startDate: '2026-09-14', frequency: { type: 'weekly', times: 3 } });
  const week14 = ['2026-09-14', '2026-09-15', '2026-09-17'];
  const week21 = ['2026-09-21', '2026-09-23', '2026-09-24', '2026-09-26'];

  it('counts streaks in weeks and leaves the current week open', () => {
    const s = computeStreak(weekly, values(...week14, ...week21, '2026-09-29'), TODAY);
    expect(s).toMatchObject({ current: 2, unit: 'week', doneNow: false, atRisk: false });
  });

  it('adds the current week once its target is met', () => {
    const s = computeStreak(weekly, values(...week14, ...week21, '2026-09-28', '2026-09-29', TODAY), TODAY);
    expect(s).toMatchObject({ current: 3, longest: 3, doneNow: true });
  });

  it('breaks on a short week, unless a freeze covers a single miss', () => {
    const short = values(...week14, '2026-09-21', '2026-09-23');
    expect(computeStreak(weekly, short, TODAY).current).toBe(0);
    const frozen = computeStreak({ ...weekly, freezes: true }, short, TODAY);
    expect(frozen.current).toBe(1);
    expect(frozen.frozen).toEqual(['2026-09-21']);
    const tooShort = values(...week14, '2026-09-21');
    expect(computeStreak({ ...weekly, freezes: true }, tooShort, TODAY).current).toBe(0);
  });

  it('scales the first partial week', () => {
    const h = { ...weekly, startDate: '2026-09-26' }; // Saturday: 2 days available
    expect(computeStreak(h, values('2026-09-26', '2026-09-27'), TODAY).current).toBe(1);
  });

  it('flags risk when every remaining day is needed', () => {
    const v = values(...week14, ...week21, '2026-09-28');
    expect(computeStreak(weekly, v, '2026-10-02').atRisk).toBe(false); // Fri: need 2, 3 days left
    expect(computeStreak(weekly, v, '2026-10-03').atRisk).toBe(true); // Sat: need 2, 2 days left
  });
});

describe('day boundaries in IST', () => {
  const daily = makeHabit({ startDate: '2026-09-01' });
  const v = every('2026-09-28', '2026-10-01');
  const justAfterMidnight = new Date('2026-10-01T18:45:00Z'); // 00:15 IST on Oct 2

  it('a new day starts at local midnight and does not break the streak', () => {
    const today = todayKey(justAfterMidnight);
    expect(today).toBe('2026-10-02');
    expect(computeStreak(daily, v, today)).toMatchObject({ current: 4, doneNow: false, atRisk: true });
  });

  it('with a 3 AM day start, 00:15 still belongs to yesterday', () => {
    const today = todayKey(justAfterMidnight, 3);
    expect(today).toBe('2026-10-01');
    expect(computeStreak(daily, v, today)).toMatchObject({ current: 4, doneNow: true });
  });

  it('a whole missed day in IST breaks the streak', () => {
    const nextNight = new Date('2026-10-02T18:45:00Z'); // 00:15 IST on Oct 3
    const today = todayKey(nextNight);
    expect(today).toBe(addDays('2026-10-01', 2));
    expect(computeStreak(daily, v, today).current).toBe(0);
  });
});
