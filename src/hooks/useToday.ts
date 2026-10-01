import { useEffect, useState } from 'react';
import type { DateKey } from '../types';
import { todayKey } from '../utils/dates';

/** The current logical day; rolls over on its own (and when the tab wakes up). */
export function useToday(dayStartHour: number): DateKey {
  const [today, setToday] = useState(() => todayKey(new Date(), dayStartHour));

  useEffect(() => {
    const tick = () => setToday(todayKey(new Date(), dayStartHour));
    tick();
    const id = window.setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [dayStartHour]);

  return today;
}
