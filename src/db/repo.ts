import type { DateKey, Entry, Habit, Settings } from '../types';
import { db, DEFAULT_SETTINGS } from './db';
import { entryId, newId } from '../utils/id';

export type HabitInput = Omit<Habit, 'id' | 'order' | 'archivedAt' | 'createdAt' | 'updatedAt'>;

export async function addHabit(input: HabitInput): Promise<Habit> {
  const last = await db.habits.orderBy('order').last();
  const now = Date.now();
  const habit: Habit = {
    ...input,
    id: newId(),
    order: (last?.order ?? -1) + 1,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.habits.add(habit);
  return habit;
}

export async function updateHabit(id: string, patch: Partial<Omit<Habit, 'id'>>): Promise<void> {
  await db.habits.update(id, { ...patch, updatedAt: Date.now() });
}

export const archiveHabit = (id: string, today: DateKey) => updateHabit(id, { archivedAt: today });
export const restoreHabit = (id: string) => updateHabit(id, { archivedAt: null });

export interface DeletedHabit {
  habit: Habit;
  entries: Entry[];
}

/** Deletes a habit and its history; returns what was removed so it can be undone. */
export async function deleteHabit(id: string): Promise<DeletedHabit | null> {
  return db.transaction('rw', db.habits, db.entries, async () => {
    const habit = await db.habits.get(id);
    if (!habit) return null;
    const entries = await db.entries.where('habitId').equals(id).toArray();
    await db.entries.where('habitId').equals(id).delete();
    await db.habits.delete(id);
    return { habit, entries };
  });
}

export async function undoDelete({ habit, entries }: DeletedHabit): Promise<void> {
  await db.transaction('rw', db.habits, db.entries, async () => {
    await db.habits.put(habit);
    await db.entries.bulkPut(entries);
  });
}

export async function reorderHabits(ids: string[]): Promise<void> {
  await db.transaction('rw', db.habits, async () => {
    await Promise.all(ids.map((id, order) => db.habits.update(id, { order })));
  });
}

/** Set a day's value; zero removes the entry. */
export async function setEntryValue(habitId: string, date: DateKey, value: number): Promise<void> {
  const id = entryId(habitId, date);
  const rounded = Math.round(value * 100) / 100;
  if (rounded <= 0) await db.entries.delete(id);
  else await db.entries.put({ id, habitId, date, value: rounded, updatedAt: Date.now() });
}

export async function saveSettings(patch: Partial<Omit<Settings, 'key'>>): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const current = (await db.settings.get('settings')) ?? DEFAULT_SETTINGS;
    await db.settings.put({ ...current, ...patch, key: 'settings' });
  });
}

export async function replaceAllData(habits: Habit[], entries: Entry[]): Promise<void> {
  await db.transaction('rw', db.habits, db.entries, async () => {
    await db.habits.clear();
    await db.entries.clear();
    await db.habits.bulkAdd(habits);
    await db.entries.bulkAdd(entries);
  });
}

export async function clearAllData(): Promise<void> {
  await replaceAllData([], []);
}
