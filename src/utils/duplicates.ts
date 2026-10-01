import type { Entry, Habit } from '../types';
import { entryId } from './id';

const normalize = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Active habits that share a name, grouped, oldest first. Two devices that
 * each created "Gym" before signing in will show both after syncing.
 */
export function findDuplicateGroups(habits: readonly Habit[]): Habit[][] {
  const groups = new Map<string, Habit[]>();
  for (const h of habits) {
    if (h.archivedAt) continue;
    const key = normalize(h.name);
    groups.set(key, [...(groups.get(key) ?? []), h]);
  }
  return [...groups.values()]
    .filter((g) => g.length > 1)
    .map((g) => [...g].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id)));
}

/** Re-keys all entries onto `keepId`, keeping the highest value per day. */
export function mergeDuplicateEntries(keepId: string, entries: readonly Entry[], now: number): Entry[] {
  const best = new Map<string, number>();
  for (const e of entries) best.set(e.date, Math.max(best.get(e.date) ?? 0, e.value));
  return [...best]
    .filter(([, value]) => value > 0)
    .map(([date, value]) => ({ id: entryId(keepId, date), habitId: keepId, date, value, updatedAt: now }));
}
