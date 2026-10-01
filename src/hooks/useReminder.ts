import { useEffect } from 'react';
import { useData } from './useData';
import { dayScore } from '../utils/stats';
import { toDateKey } from '../utils/dates';

const LAST_SENT_KEY = 'streak:lastReminder';

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export async function showNotification(title: string, body: string): Promise<void> {
  const options: NotificationOptions = {
    body,
    icon: `${import.meta.env.BASE_URL}pwa-192x192.png`,
    badge: `${import.meta.env.BASE_URL}pwa-64x64.png`,
    tag: 'streak-daily-reminder',
  };
  // Prefer the service worker: it's required on Android and lets clicks focus the app.
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  if (reg) await reg.showNotification(title, options);
  else new Notification(title, options);
}

function readLastSent(): string | null {
  try {
    return localStorage.getItem(LAST_SENT_KEY);
  } catch {
    return null;
  }
}

/**
 * Fires one reminder per day after the chosen time if habits are still open.
 * Web apps can't schedule notifications without a push server, so this runs
 * while Streak is open in a tab or as an installed app (even in the background).
 */
export function useReminder(): void {
  const { settings, settingsReady, activeHabits, index, today, streaks } = useData();

  useEffect(() => {
    if (!settingsReady || !settings.reminderEnabled || !notificationsSupported()) return;

    const check = () => {
      if (Notification.permission !== 'granted') return;
      const now = new Date();
      const [hh, mm] = settings.reminderTime.split(':').map(Number);
      if (now.getHours() * 60 + now.getMinutes() < hh * 60 + mm) return;
      const sentKey = toDateKey(now);
      if (readLastSent() === sentKey) return;
      // No need to nudge someone who's looking at the app right now.
      if (document.visibilityState === 'visible' && document.hasFocus()) return;

      const score = dayScore(activeHabits, index, today);
      const left = score.total - score.completions;
      if (left <= 0) return;

      try {
        localStorage.setItem(LAST_SENT_KEY, sentKey);
      } catch {
        // Ignore storage errors; worst case a second reminder goes out.
      }
      const best = Math.max(
        0,
        ...activeHabits.map((h) => {
          const s = streaks.get(h.id);
          return s?.atRisk && s.unit === 'day' ? s.current : 0;
        }),
      );
      const body =
        best >= 2
          ? `${left} habit${left === 1 ? '' : 's'} left today. Keep your ${best}-day streak alive 🔥`
          : `${left} habit${left === 1 ? '' : 's'} left today. A small step still counts.`;
      void showNotification('Streak', body);
    };

    check();
    const id = window.setInterval(check, 30_000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('blur', check);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('blur', check);
    };
  }, [settingsReady, settings.reminderEnabled, settings.reminderTime, activeHabits, index, today, streaks]);
}
