import { useEffect, useState } from 'react';

export type Page = 'today' | 'calendar' | 'stats' | 'habits' | 'settings';
const PAGES: Page[] = ['today', 'calendar', 'stats', 'habits', 'settings'];

export interface Route {
  page: Page;
  param?: string;
}

/** Hash routes (`#/stats/<habitId>`) work on GitHub Pages without any server rewrites. */
function parse(hash: string): Route {
  const [page, param] = hash.replace(/^#\/?/, '').split('/');
  return PAGES.includes(page as Page)
    ? { page: page as Page, param: param ? decodeURIComponent(param) : undefined }
    : { page: 'today' };
}

export function navigate(page: Page, param?: string): void {
  const next = page === 'today' ? '#/' : `#/${page}${param ? `/${encodeURIComponent(param)}` : ''}`;
  if (window.location.hash !== next) window.location.hash = next;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parse(window.location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
