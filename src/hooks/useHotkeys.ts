import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Global single-key shortcuts. Ignored while typing, while a dialog is open,
 * and when a modifier other than Shift is held. Return true when handled.
 */
export function useHotkeys(handler: (e: KeyboardEvent) => boolean | void): void {
  const ref = useRef(handler);
  useLayoutEffect(() => {
    ref.current = handler;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (document.querySelector('[data-modal]')) return;
      if (ref.current(e) === true) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
