import { useEffect, useState } from 'react';

export const PAGES = ['start', 'health', 'profit', 'stock', 'suppliers', 'outlets', 'cashflow', 'findings', 'rules', 'report'] as const;
export type Page = (typeof PAGES)[number];

export interface Route {
  page: Page;
  query: URLSearchParams;
}

function parse(hash: string): Route {
  const h = hash.replace(/^#\/?/, '');
  const [path = '', q = ''] = h.split('?');
  const page = (PAGES as readonly string[]).includes(path) ? (path as Page) : 'start';
  return { page, query: new URLSearchParams(q) };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(globalThis.location?.hash ?? ''));
  useEffect(() => {
    const on = () => setRoute(parse(location.hash));
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}

/** Only page names and finding ids/filters go into the URL — never file contents. */
export function href(page: Page, query?: Record<string, string>): string {
  const q = query ? new URLSearchParams(query).toString() : '';
  return `#/${page}${q ? `?${q}` : ''}`;
}

export function navigate(page: Page, query?: Record<string, string>): void {
  location.hash = href(page, query);
  globalThis.scrollTo?.({ top: 0 });
}
