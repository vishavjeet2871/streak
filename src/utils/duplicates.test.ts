import { describe, expect, it } from 'vitest';
import { findDuplicateGroups, mergeDuplicateEntries } from './duplicates';
import { makeHabit } from './testHelpers';
import type { Entry } from '../types';

describe('findDuplicateGroups', () => {
  it('groups active habits by normalized name, oldest first', () => {
    const laptop = makeHabit({ id: 'a', name: 'Gym', createdAt: 200 });
    const phone = makeHabit({ id: 'b', name: '  gym ', createdAt: 100 });
    const other = makeHabit({ id: 'c', name: 'Read 20 min' });
    const archived = makeHabit({ id: 'd', name: 'Gym', archivedAt: '2026-09-01' });
    expect(findDuplicateGroups([laptop, phone, other, archived])).toEqual([[phone, laptop]]);
  });

  it('finds nothing when names are unique', () => {
    expect(findDuplicateGroups([makeHabit({ id: 'a', name: 'A' }), makeHabit({ id: 'b', name: 'B' })])).toEqual([]);
  });
});

describe('mergeDuplicateEntries', () => {
  it('re-keys entries onto the kept habit with the best value per day', () => {
    const e = (habitId: string, date: string, value: number): Entry => ({ id: `${habitId}:${date}`, habitId, date, value, updatedAt: 1 });
    const merged = mergeDuplicateEntries('keep', [e('keep', '2026-09-30', 1), e('dup', '2026-09-30', 3), e('dup', '2026-10-01', 2)], 9);
    expect(merged).toEqual([
      { id: 'keep:2026-09-30', habitId: 'keep', date: '2026-09-30', value: 3, updatedAt: 9 },
      { id: 'keep:2026-10-01', habitId: 'keep', date: '2026-10-01', value: 2, updatedAt: 9 },
    ]);
  });
});
