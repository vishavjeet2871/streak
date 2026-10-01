import { db, DEFAULT_SETTINGS, DEVICE_PREFS_KEY, SYNCED_SETTINGS_KEY } from './db';
import type { Entry, Habit } from '../types';
import { replaceAllData, saveSettings } from './repo';
import { createBackup, parseBackup, toCSV } from '../utils/backup';
import { todayKey } from '../utils/dates';

export function downloadFile(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const cleanHabit = (h: Habit): Habit => ({
  id: h.id,
  name: h.name,
  emoji: h.emoji,
  color: h.color,
  kind: h.kind,
  target: h.target,
  unit: h.unit,
  step: h.step,
  frequency: h.frequency,
  startDate: h.startDate,
  freezes: h.freezes,
  order: h.order,
  archivedAt: h.archivedAt,
  createdAt: h.createdAt,
  updatedAt: h.updatedAt,
});

const cleanEntry = ({ id, habitId, date, value, updatedAt }: Entry): Entry => ({ id, habitId, date, value, updatedAt });

export async function exportJSON(): Promise<void> {
  const [habits, entries, synced, device] = await Promise.all([
    db.habits.toArray(),
    db.entries.toArray(),
    db.settings.get(SYNCED_SETTINGS_KEY),
    db.prefs.get(DEVICE_PREFS_KEY),
  ]);
  const portable = {
    name: synced?.name ?? DEFAULT_SETTINGS.name,
    dayStartHour: synced?.dayStartHour ?? DEFAULT_SETTINGS.dayStartHour,
    theme: device?.theme ?? DEFAULT_SETTINGS.theme,
    reminderTime: device?.reminderTime ?? DEFAULT_SETTINGS.reminderTime,
  };
  // Drop sync bookkeeping (owner, realmId, $ts) so backups stay portable.
  const backup = createBackup(habits.map(cleanHabit), entries.map(cleanEntry), portable);
  downloadFile(`streak-backup-${todayKey()}.json`, JSON.stringify(backup, null, 2), 'application/json');
}

export async function exportCSV(): Promise<void> {
  const [habits, entries] = await Promise.all([db.habits.toArray(), db.entries.toArray()]);
  downloadFile(`streak-entries-${todayKey()}.csv`, toCSV(habits, entries), 'text/csv;charset=utf-8');
}

/** Replaces all habits and entries with the backup's. Throws BackupError on bad files. */
export async function importJSON(file: File): Promise<{ habits: number; entries: number }> {
  const { habits, entries, settings } = parseBackup(await file.text());
  await replaceAllData(habits, entries);
  if (settings) {
    const patch: Parameters<typeof saveSettings>[0] = {};
    if (typeof settings.name === 'string') patch.name = settings.name;
    if (settings.theme === 'system' || settings.theme === 'light' || settings.theme === 'dark') patch.theme = settings.theme;
    if (Number.isInteger(settings.dayStartHour) && settings.dayStartHour! >= 0 && settings.dayStartHour! <= 6)
      patch.dayStartHour = settings.dayStartHour;
    if (typeof settings.reminderTime === 'string' && /^\d{2}:\d{2}$/.test(settings.reminderTime))
      patch.reminderTime = settings.reminderTime;
    await saveSettings(patch);
  }
  return { habits: habits.length, entries: entries.length };
}
