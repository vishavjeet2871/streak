import { useEffect } from 'react';
import type { ThemePref } from '../types';

export const THEME_STORAGE_KEY = 'streak:theme';

/** Applies the theme class and browser chrome color. index.html applies it before first paint. */
export function useApplyTheme(pref: ThemePref | undefined): void {
  useEffect(() => {
    if (!pref) return;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch {
      // Storage can be unavailable (private mode); the theme still applies for this session.
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = pref === 'dark' || (pref === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b0b0f' : '#f6f6f4');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [pref]);
}
