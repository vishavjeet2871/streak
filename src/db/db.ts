import Dexie, { type EntityTable } from 'dexie';
import dexieCloud from 'dexie-cloud-addon';
import type { Entry, Habit, Settings } from '../types';

/**
 * Dexie Cloud database URL, from `.env`. It is public by nature (it ships in
 * the client bundle). Without it, Streak runs purely local with no sync UI.
 */
export const CLOUD_URL: string | undefined = import.meta.env.VITE_DEXIE_CLOUD_URL || undefined;

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  theme: 'system',
  dayStartHour: 0,
  reminderEnabled: false,
  reminderTime: '21:00',
};

/** Settings that follow you across devices. A '#' key is a private per-user singleton in Dexie Cloud. */
export const SYNCED_SETTINGS_KEY = '#settings';
export const SYNCED_SETTING_FIELDS = ['name', 'dayStartHour'] as const;
export type SyncedSettings = Pick<Settings, (typeof SYNCED_SETTING_FIELDS)[number]> & { key: string };

/** Per-device preferences (theme, reminders): notification permission and taste differ per device. */
export const DEVICE_PREFS_KEY = 'device';
/** Temporary row holding v1 synced settings until they're re-saved with change tracking on. */
export const LEGACY_SETTINGS_KEY = 'legacy-settings';
export const DEVICE_PREF_FIELDS = ['theme', 'reminderEnabled', 'reminderTime'] as const;
export type DevicePrefs = Pick<Settings, (typeof DEVICE_PREF_FIELDS)[number]> & { key: string };

class StreakDB extends Dexie {
  habits!: EntityTable<Habit, 'id'>;
  entries!: EntityTable<Entry, 'id'>;
  settings!: EntityTable<SyncedSettings, 'key'>;
  prefs!: EntityTable<DevicePrefs, 'key'>;

  constructor() {
    super('streak', { addons: CLOUD_URL ? [dexieCloud] : [] });

    this.version(1).stores({
      habits: 'id, order',
      // id is `${habitId}:${date}`, so each habit has at most one entry per day
      entries: 'id, habitId, date',
      settings: 'key',
    });

    // v2: split the single settings row into synced settings and device-only prefs.
    this.version(2)
      .stores({ prefs: 'key' })
      .upgrade(async (tx) => {
        const old = await tx.table('settings').get('settings');
        if (!old) return;
        await tx.table('settings').delete('settings');
        // Dexie Cloud doesn't track writes made during an upgrade, so a synced row written
        // here would never upload. Park those fields; finishSettingsMigration() saves them
        // through the normal path once the app is running.
        await tx.table('prefs').put({
          key: LEGACY_SETTINGS_KEY,
          name: old.name ?? DEFAULT_SETTINGS.name,
          dayStartHour: old.dayStartHour ?? DEFAULT_SETTINGS.dayStartHour,
        });
        await tx.table('prefs').put({
          key: DEVICE_PREFS_KEY,
          theme: old.theme ?? DEFAULT_SETTINGS.theme,
          reminderEnabled: old.reminderEnabled ?? DEFAULT_SETTINGS.reminderEnabled,
          reminderTime: old.reminderTime ?? DEFAULT_SETTINGS.reminderTime,
        });
      });

    if (CLOUD_URL) {
      this.cloud.configure({
        databaseUrl: CLOUD_URL,
        // Streak stays fully usable offline without an account; signing in turns sync on.
        requireAuth: false,
        // Our own sign-in sheet (SyncDialog) renders db.cloud.userInteraction.
        customLoginGui: true,
        socialAuth: false,
        unsyncedTables: ['prefs'],
        // Keep using the existing local "streak" database instead of a URL-suffixed copy.
        nameSuffix: false,
      });
    }
  }
}

export const db = new StreakDB();
