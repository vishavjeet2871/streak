import { describe, expect, it } from 'vitest';
import { BackupError, createBackup, parseBackup, toCSV } from './backup';
import { makeHabit } from './testHelpers';
import type { Entry } from '../types';

const habit = makeHabit({ id: 'a', name: 'Read 20 min' });
const counter = makeHabit({ id: 'b', name: '=SUM(1,2)', kind: 'count', target: 3, unit: 'problems, hard', order: 1 });
const entries: Entry[] = [
  { id: 'a:2026-10-01', habitId: 'a', date: '2026-10-01', value: 1, updatedAt: 1 },
  { id: 'b:2026-09-30', habitId: 'b', date: '2026-09-30', value: 2, updatedAt: 1 },
];

describe('JSON backups', () => {
  it('round-trips', () => {
    const json = JSON.stringify(createBackup([habit, counter], entries, { theme: 'dark' }));
    const parsed = parseBackup(json);
    expect(parsed.habits).toEqual([habit, counter]);
    expect(parsed.entries).toEqual(entries);
    expect(parsed.settings).toEqual({ theme: 'dark' });
  });

  it('rejects files that are not Streak backups', () => {
    expect(() => parseBackup('not json')).toThrow(BackupError);
    expect(() => parseBackup('{"habits": []}')).toThrow(/Streak backup/);
    expect(() => parseBackup(JSON.stringify({ ...createBackup([], []), version: 99 }))).toThrow(/newer version/);
  });

  it('rejects habits with bad dates and duplicate ids', () => {
    const bad = createBackup([{ ...habit, startDate: '2026-13-01' }], []);
    expect(() => parseBackup(JSON.stringify(bad))).toThrow(/start date/);
    expect(() => parseBackup(JSON.stringify(createBackup([habit, habit], [])))).toThrow(/duplicate/);
  });

  it('drops orphaned, empty and malformed entries and repairs the rest', () => {
    const messy = createBackup(
      [{ ...habit, frequency: { type: 'weekdays', days: [9, 1, 1] } }],
      [
        ...entries,
        { id: 'x', habitId: 'a', date: '2026-09-29', value: 1, updatedAt: 1 },
        { id: 'z', habitId: 'a', date: '2026-09-28', value: 0, updatedAt: 1 },
        { id: 'y', habitId: 'a', date: 'yesterday', value: 1, updatedAt: 1 },
      ],
    );
    const parsed = parseBackup(JSON.stringify(messy));
    expect(parsed.habits[0].frequency).toEqual({ type: 'weekdays', days: [1] });
    expect(parsed.entries.map((e) => e.id)).toEqual(['a:2026-10-01', 'a:2026-09-29']);
  });
});

describe('CSV export', () => {
  it('writes one escaped row per entry, sorted by date', () => {
    const csv = toCSV([habit, counter], entries);
    expect(csv.split('\n')).toEqual([
      'date,habit,emoji,value,target,unit,completed',
      `2026-09-30,"'=SUM(1,2)",✅,2,3,"problems, hard",false`,
      '2026-10-01,Read 20 min,✅,1,1,,true',
      '',
    ]);
  });
});
