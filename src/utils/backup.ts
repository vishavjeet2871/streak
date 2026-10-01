import type { Entry, Frequency, Habit, Settings } from '../types';
import { isDateKey } from './dates';
import { entryId } from './id';
import { isComplete } from './schedule';
import { HABIT_COLORS } from './colors';

export const BACKUP_VERSION = 1;

export interface BackupFile {
  app: 'streak';
  version: number;
  exportedAt: string;
  habits: Habit[];
  entries: Entry[];
  settings?: Partial<Settings>;
}

export function createBackup(
  habits: Habit[],
  entries: Entry[],
  settings?: Partial<Settings>,
  now = new Date(),
): BackupFile {
  return { app: 'streak', version: BACKUP_VERSION, exportedAt: now.toISOString(), habits, entries, settings };
}

export class BackupError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

function parseFrequency(v: unknown): Frequency {
  if (isObj(v)) {
    if (v.type === 'weekdays' && Array.isArray(v.days)) {
      const days = [...new Set(v.days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))];
      if (days.length > 0) return { type: 'weekdays', days };
    }
    if (v.type === 'weekly') {
      const times = Math.round(num(v.times, 0));
      if (times >= 1 && times <= 7) return { type: 'weekly', times };
    }
  }
  return { type: 'daily' };
}

function parseHabit(v: unknown, i: number): Habit {
  if (!isObj(v) || typeof v.id !== 'string' || !v.id) throw new BackupError(`Habit #${i + 1} is missing an id.`);
  if (!isDateKey(v.startDate)) throw new BackupError(`Habit "${str(v.name, v.id)}" has an invalid start date.`);
  const kind = v.kind === 'count' ? 'count' : 'check';
  const now = Date.now();
  return {
    id: v.id,
    name: str(v.name, 'Untitled habit').slice(0, 80) || 'Untitled habit',
    emoji: str(v.emoji, '✨') || '✨',
    color: /^#[0-9a-f]{6}$/i.test(str(v.color)) ? str(v.color) : HABIT_COLORS[0].hex,
    kind,
    target: kind === 'check' ? 1 : Math.max(num(v.target, 1), 0.01),
    unit: str(v.unit).slice(0, 40),
    step: Math.max(num(v.step, 1), 0.01),
    frequency: parseFrequency(v.frequency),
    startDate: v.startDate,
    freezes: v.freezes === true,
    order: num(v.order, i),
    archivedAt: isDateKey(v.archivedAt) ? v.archivedAt : null,
    createdAt: num(v.createdAt, now),
    updatedAt: num(v.updatedAt, now),
  };
}

/** Validate and normalize a backup. Throws BackupError with a user-facing message. */
export function parseBackup(text: string): Pick<BackupFile, 'habits' | 'entries' | 'settings'> {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('That file isn’t valid JSON.');
  }
  if (!isObj(data) || data.app !== 'streak' || !Array.isArray(data.habits) || !Array.isArray(data.entries)) {
    throw new BackupError('That doesn’t look like a Streak backup.');
  }
  if (num(data.version, 0) > BACKUP_VERSION) {
    throw new BackupError('This backup was made by a newer version of Streak.');
  }

  const habits = data.habits.map(parseHabit);
  const ids = new Set(habits.map((h) => h.id));
  if (ids.size !== habits.length) throw new BackupError('The backup contains duplicate habits.');

  const byId = new Map<string, Entry>();
  for (const e of data.entries) {
    if (!isObj(e) || typeof e.habitId !== 'string' || !ids.has(e.habitId) || !isDateKey(e.date)) continue;
    const value = num(e.value, 0);
    if (value <= 0) continue;
    const id = entryId(e.habitId, e.date);
    byId.set(id, { id, habitId: e.habitId, date: e.date, value, updatedAt: num(e.updatedAt, Date.now()) });
  }

  const settings = isObj(data.settings) ? (data.settings as Partial<Settings>) : undefined;
  return { habits, entries: [...byId.values()], settings };
}

function csvCell(v: string | number | boolean): string {
  let s = String(v);
  // Keep spreadsheets from interpreting habit names as formulas.
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** One row per logged day per habit, sorted by date then habit order. */
export function toCSV(habits: readonly Habit[], entries: readonly Entry[]): string {
  const byId = new Map(habits.map((h) => [h.id, h]));
  const rows = entries
    .filter((e) => byId.has(e.habitId))
    .sort((a, b) => a.date.localeCompare(b.date) || byId.get(a.habitId)!.order - byId.get(b.habitId)!.order);
  const header = ['date', 'habit', 'emoji', 'value', 'target', 'unit', 'completed'];
  const lines = rows.map((e) => {
    const h = byId.get(e.habitId)!;
    return [e.date, h.name, h.emoji, e.value, h.target, h.kind === 'count' ? h.unit : '', isComplete(h, e.value)]
      .map(csvCell)
      .join(',');
  });
  return [header.join(','), ...lines].join('\n') + '\n';
}
