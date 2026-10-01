import type { DateKey, Entry, Habit, Settings } from '../types';
import {
  db,
  DEFAULT_SETTINGS,
  DEVICE_PREF_FIELDS,
  DEVICE_PREFS_KEY,
  LEGACY_SETTINGS_KEY,
  SYNCED_SETTING_FIELDS,
  SYNCED_SETTINGS_KEY,
} from './db';
import { mergeDuplicateEntries } from '../utils/duplicates';
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

function pick<K extends keyof Settings>(patch: Partial<Settings>, keys: readonly K[]): Partial<Pick<Settings, K>> {
  const out: Partial<Pick<Settings, K>> = {};
  for (const k of keys) if (patch[k] !== undefined) out[k] = patch[k];
  return out;
}

/** Routes each field to where it lives: synced settings or this device's prefs. */
export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const synced = pick(patch, SYNCED_SETTING_FIELDS);
  const device = pick(patch, DEVICE_PREF_FIELDS);
  await db.transaction('rw', db.settings, db.prefs, async () => {
    if (Object.keys(synced).length) {
      const cur = await db.settings.get(SYNCED_SETTINGS_KEY);
      await db.settings.put({
        key: SYNCED_SETTINGS_KEY,
        name: synced.name ?? cur?.name ?? DEFAULT_SETTINGS.name,
        dayStartHour: synced.dayStartHour ?? cur?.dayStartHour ?? DEFAULT_SETTINGS.dayStartHour,
      });
    }
    if (Object.keys(device).length) {
      const cur = await db.prefs.get(DEVICE_PREFS_KEY);
      await db.prefs.put({
        key: DEVICE_PREFS_KEY,
        theme: device.theme ?? cur?.theme ?? DEFAULT_SETTINGS.theme,
        reminderEnabled: device.reminderEnabled ?? cur?.reminderEnabled ?? DEFAULT_SETTINGS.reminderEnabled,
        reminderTime: device.reminderTime ?? cur?.reminderTime ?? DEFAULT_SETTINGS.reminderTime,
      });
    }
  });
}

/** Finishes the v2 settings split started in the db upgrade (see LEGACY_SETTINGS_KEY). */
export async function finishSettingsMigration(): Promise<void> {
  const prefs = db.table<{ key: string; name?: string; dayStartHour?: number }, string>('prefs');
  const legacy = await prefs.get(LEGACY_SETTINGS_KEY);
  if (!legacy) return;
  if (!(await db.settings.get(SYNCED_SETTINGS_KEY))) {
    await saveSettings({ name: legacy.name, dayStartHour: legacy.dayStartHour });
  }
  await prefs.delete(LEGACY_SETTINGS_KEY);
}

/**
 * Folds habits that share a name (typically the same habit created on two
 * devices before they synced) into the oldest one, keeping the best value
 * logged on each day. Returns how many duplicates were removed.
 */
export async function mergeDuplicateHabits(groups: Habit[][]): Promise<number> {
  let removed = 0;
  await db.transaction('rw', db.habits, db.entries, async () => {
    for (const [keep, ...dupes] of groups) {
      const ids = [keep.id, ...dupes.map((d) => d.id)];
      const entries = await db.entries.where('habitId').anyOf(ids).toArray();
      const merged = mergeDuplicateEntries(keep.id, entries, Date.now());
      await db.entries.where('habitId').anyOf(dupes.map((d) => d.id)).delete();
      await db.entries.bulkPut(merged);
      // An earlier start date on a duplicate means history we just moved over.
      const startDate = [keep, ...dupes].reduce((min, h) => (h.startDate < min ? h.startDate : min), keep.startDate);
      await db.habits.update(keep.id, { startDate, updatedAt: Date.now() });
      await db.habits.bulkDelete(dupes.map((d) => d.id));
      removed += dupes.length;
    }
  });
  return removed;
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
