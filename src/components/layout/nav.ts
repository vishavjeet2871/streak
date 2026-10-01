import { BarChart3, CalendarDays, Flame, ListChecks, Settings2, type LucideIcon } from 'lucide-react';
import type { Page } from '../../hooks/useRoute';

export const NAV_ITEMS: { page: Page; label: string; icon: LucideIcon; key: string }[] = [
  { page: 'today', label: 'Today', icon: Flame, key: 't' },
  { page: 'calendar', label: 'Calendar', icon: CalendarDays, key: 'c' },
  { page: 'stats', label: 'Stats', icon: BarChart3, key: 's' },
  { page: 'habits', label: 'Habits', icon: ListChecks, key: 'h' },
  { page: 'settings', label: 'Settings', icon: Settings2, key: ',' },
];
