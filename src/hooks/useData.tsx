import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, DEFAULT_SETTINGS } from '../db/db';
import type { DateKey, Entry, EntryIndex, Habit, Settings, ValueMap } from '../types';
import { computeStreak, type StreakInfo } from '../utils/streaks';
import { valuesFor } from '../utils/stats';
import { useToday } from './useToday';

interface DataState {
  /** Habits and entries have loaded from IndexedDB */
  ready: boolean;
  /** Settings have loaded (until then `settings` holds defaults) */
  settingsReady: boolean;
  /** Every habit, archived included, in the user's order */
  habits: Habit[];
  activeHabits: Habit[];
  archivedHabits: Habit[];
  entries: Entry[];
  index: EntryIndex;
  settings: Settings;
  today: DateKey;
  streaks: ReadonlyMap<string, StreakInfo>;
  values: (habitId: string) => ValueMap;
}

const DataContext = createContext<DataState | null>(null);

function buildIndex(entries: Entry[]): EntryIndex {
  const index = new Map<string, Map<DateKey, number>>();
  for (const e of entries) {
    let m = index.get(e.habitId);
    if (!m) index.set(e.habitId, (m = new Map()));
    m.set(e.date, e.value);
  }
  return index;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const habitsRaw = useLiveQuery(() => db.habits.orderBy('order').toArray(), []);
  const entriesRaw = useLiveQuery(() => db.entries.toArray(), []);
  // null = loaded but never saved, undefined = still loading
  const settingsRow = useLiveQuery(async () => (await db.settings.get('settings')) ?? null, []);

  const settings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...settingsRow }), [settingsRow]);
  const today = useToday(settings.dayStartHour);

  const value = useMemo<DataState>(() => {
    const habits = habitsRaw ?? [];
    const entries = entriesRaw ?? [];
    const index = buildIndex(entries);
    const streaks = new Map(habits.map((h) => [h.id, computeStreak(h, valuesFor(index, h.id), today)]));
    return {
      ready: habitsRaw !== undefined && entriesRaw !== undefined,
      settingsReady: settingsRow !== undefined,
      habits,
      activeHabits: habits.filter((h) => !h.archivedAt),
      archivedHabits: habits.filter((h) => h.archivedAt),
      entries,
      index,
      settings,
      today,
      streaks,
      values: (id) => valuesFor(index, id),
    };
  }, [habitsRaw, entriesRaw, settingsRow, settings, today]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataState {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}
