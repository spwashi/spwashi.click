/**
 * Intent:
 * Provide predictable route parsing for multi-page static navigation under a custom-domain root.
 * Invariants:
 * Only home/work/notes are public routes and every route has a canonical href.
 * How this composes with neighbors:
 * Boot derives activeRoute from pathname and site-shell highlights navigation using these helpers.
 */

const ROUTE_TO_HREF = Object.freeze({
  home: '/',
  work: '/work/',
  notes: '/notes/'
});

export const ROUTES = Object.freeze(Object.keys(ROUTE_TO_HREF));

export function normalizePathname(pathname = '/') {
  if (typeof pathname !== 'string' || pathname.length === 0) {
    return '/';
  }

  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;

  if (withLeadingSlash === '/') {
    return '/';
  }

  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

export function isRoute(routeName) {
  return ROUTES.includes(routeName);
}

export function coerceRoute(routeName) {
  return isRoute(routeName) ? routeName : 'home';
}

export function hrefForRoute(routeName) {
  return ROUTE_TO_HREF[coerceRoute(routeName)];
}

export function routeFromPathname(pathname = '/') {
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedPathname.startsWith('/work/')) {
    return 'work';
  }

  if (normalizedPathname.startsWith('/notes/')) {
    return 'notes';
  }

  return 'home';
}

export function routeFromHref(href, origin = globalThis.location?.origin ?? 'http://localhost') {
  try {
    const url = new URL(href, origin);
    return routeFromPathname(url.pathname);
  } catch {
    return 'home';
  }
}
