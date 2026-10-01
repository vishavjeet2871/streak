import type { DateKey, Habit } from '../types';

export function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Test habit',
    emoji: '✅',
    color: '#ff6b3d',
    kind: 'check',
    target: 1,
    unit: '',
    step: 1,
    frequency: { type: 'daily' },
    startDate: '2026-01-01',
    freezes: false,
    order: 0,
    archivedAt: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

/** Build a value map from dates (value 1) or [date, value] pairs. */
export function values(...items: (DateKey | [DateKey, number])[]): Map<DateKey, number> {
  return new Map(items.map((i) => (typeof i === 'string' ? [i, 1] : i)));
}
