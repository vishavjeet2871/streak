/** A local calendar day, always formatted `YYYY-MM-DD`. */
export type DateKey = string;

export type Frequency =
  | { type: 'daily' }
  /** 0 = Sunday … 6 = Saturday */
  | { type: 'weekdays'; days: number[] }
  /** Flexible: any X days within a Monday–Sunday week */
  | { type: 'weekly'; times: number };

export type HabitKind = 'check' | 'count';

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  /** Accent color as a hex string */
  color: string;
  kind: HabitKind;
  /** Value needed for a day to count as done. Always 1 for checkbox habits. */
  target: number;
  /** Count habits: the unit ("problems", "min"). Checkbox habits: an optional goal note ("30 min"). */
  unit: string;
  /** How much one tap adds for count habits */
  step: number;
  frequency: Frequency;
  startDate: DateKey;
  /** Allow one streak freeze per week */
  freezes: boolean;
  order: number;
  /** The habit is active on days strictly before this date. */
  archivedAt: DateKey | null;
  createdAt: number;
  updatedAt: number;
}

export interface Entry {
  /** `${habitId}:${date}` */
  id: string;
  habitId: string;
  date: DateKey;
  value: number;
  updatedAt: number;
}

export type ThemePref = 'system' | 'light' | 'dark';

/** App settings as the UI sees them. Stored split: `name`/`dayStartHour` sync across devices, the rest stays on this device. */
export interface Settings {
  name: string;
  theme: ThemePref;
  /** Hour (0–5) at which a new day begins, so late nights count toward the previous day. */
  dayStartHour: number;
  reminderEnabled: boolean;
  /** `HH:MM`, local time */
  reminderTime: string;
}

/** date → logged value for one habit */
export type ValueMap = ReadonlyMap<DateKey, number>;
/** habitId → (date → value) */
export type EntryIndex = ReadonlyMap<string, ValueMap>;
