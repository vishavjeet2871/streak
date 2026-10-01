import type { HabitInput } from '../db/repo';
import type { DateKey } from '../types';

export interface Starter {
  key: string;
  template: Omit<HabitInput, 'startDate'>;
}

export const STARTERS: Starter[] = [
  {
    key: 'leetcode',
    template: {
      name: 'Solve 1 LeetCode problem',
      emoji: '💻',
      color: '#f5a524',
      kind: 'check',
      target: 1,
      unit: '',
      step: 1,
      frequency: { type: 'daily' },
      freezes: true,
    },
  },
  {
    key: 'gym',
    template: {
      name: 'Gym',
      emoji: '🏋️',
      color: '#3b82f6',
      kind: 'check',
      target: 1,
      unit: '',
      step: 1,
      frequency: { type: 'weekly', times: 4 },
      freezes: true,
    },
  },
  {
    key: 'sleep',
    template: {
      name: 'Sleep before 1 AM',
      emoji: '😴',
      color: '#9b6cf6',
      kind: 'check',
      target: 1,
      unit: '',
      step: 1,
      frequency: { type: 'daily' },
      freezes: true,
    },
  },
  {
    key: 'read',
    template: {
      name: 'Read 20 min',
      emoji: '📚',
      color: '#22c993',
      kind: 'check',
      target: 1,
      unit: '',
      step: 1,
      frequency: { type: 'daily' },
      freezes: true,
    },
  },
  {
    key: 'water',
    template: {
      name: 'Drink 3L water',
      emoji: '💧',
      color: '#22b8cf',
      kind: 'count',
      target: 3,
      unit: 'L',
      step: 0.5,
      frequency: { type: 'daily' },
      freezes: true,
    },
  },
];

export const starterInput = (s: Starter, today: DateKey): HabitInput => ({ ...s.template, startDate: today });
