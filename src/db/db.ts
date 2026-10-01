import Dexie, { type EntityTable } from 'dexie';
import type { Entry, Habit, Settings } from '../types';

export const DEFAULT_SETTINGS: Settings = {
  key: 'settings',
  name: '',
  theme: 'system',
  dayStartHour: 0,
  reminderEnabled: false,
  reminderTime: '21:00',
};

class StreakDB extends Dexie {
  habits!: EntityTable<Habit, 'id'>;
  entries!: EntityTable<Entry, 'id'>;
  settings!: EntityTable<Settings, 'key'>;

  constructor() {
    super('streak');
    this.version(1).stores({
      habits: 'id, order',
      // id is `${habitId}:${date}`, so each habit has at most one entry per day
      entries: 'id, habitId, date',
      settings: 'key',
    });
  }
}

export const db = new StreakDB();
