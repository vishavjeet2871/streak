import { db, DEFAULT_SETTINGS } from './db';
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

export async function exportJSON(): Promise<void> {
  const [habits, entries, settings] = await Promise.all([
    db.habits.toArray(),
    db.entries.toArray(),
    db.settings.get('settings'),
  ]);
  const { key: _key, reminderEnabled: _r, ...portable } = settings ?? DEFAULT_SETTINGS;
  const backup = createBackup(habits, entries, portable);
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
