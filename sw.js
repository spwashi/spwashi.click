const RELEASE_TAG = '__ASSET_VERSION__';
const CACHE_PREFIX = 'spwashi-click';
const STATIC_CACHE = `${CACHE_PREFIX}:static:${RELEASE_TAG}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}:runtime:${RELEASE_TAG}`;
const OFFLINE_FALLBACK_URL = '/404.html';

const CORE_URLS = Object.freeze([
  '/',
  '/index.html',
  '/work/',
  '/work/index.html',
  '/notes/',
  '/notes/index.html',
  OFFLINE_FALLBACK_URL,
  '/manifest.webmanifest',
  '/favicon.svg',
  '/spw.index.json',
  '/spw.index.spw',
  '/.spw/workspace.spw',
  '/src/styles/tokens.css?v=__ASSET_VERSION__',
  '/src/styles/base.css?v=__ASSET_VERSION__',
  '/src/styles/layout.css?v=__ASSET_VERSION__',
  '/src/styles/components.css?v=__ASSET_VERSION__',
  '/src/runtime/index.js?v=__ASSET_VERSION__',
  '/src/core/boot.js?v=__ASSET_VERSION__'
]);

async function cacheUrls(cacheName, urls) {
  const cache = await caches.open(cacheName);
  for (const url of urls) {
    try {
      await cache.add(url);
    } catch {
      // ^fallback[cache-add]{ miss:ignore install:continue }
    }
  }
}

function isSameOriginRequest(request) {
  const requestUrl = new URL(request.url);
  return requestUrl.origin === self.location.origin;
}

function isShellNavigation(request) {
  return request.mode === 'navigate';
}

function isStaticAssetRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname.startsWith('/src/') || pathname.startsWith('/seed/')) {
    return true;
  }

  if (pathname.startsWith('/work/') || pathname.startsWith('/notes/')) {
    return true;
  }

  if (
    pathname.endsWith('.css') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.json') ||
    pathname.endsWith('.spw') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.webmanifest')
  ) {
    return true;
  }

  return false;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    const staticCache = await caches.open(STATIC_CACHE);
    return (
      (await staticCache.match('/index.html')) ||
      (await staticCache.match(OFFLINE_FALLBACK_URL)) ||
      Response.error()
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) {
    return networkResponse;
  }

  return (await caches.match(request)) || Response.error();
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      await cacheUrls(STATIC_CACHE, CORE_URLS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key.startsWith(`${CACHE_PREFIX}:`) && !key.endsWith(`:${RELEASE_TAG}`)) {
            return caches.delete(key);
          }

          return Promise.resolve(false);
        })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || !isSameOriginRequest(request)) {
    return;
  }

  if (isShellNavigation(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isStaticAssetRequest(request)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SPW_SW_ACTIVATE') {
    self.skipWaiting();
  }
});
