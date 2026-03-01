/**
 * ^intent:
 * ^intent[module]{ id:core.runtime-config mode:spwlang surface:web }
 * ^invariants:
 * ^invariant[form]{ determinism:locked contracts:explicit sidefx:bounded }
 * ^invariant[state]{ mutation:public-api projection:data+aria }
 * ^compose:
 * ^compose[neighbors]{ ingress:imports egress:exports bridge:event+store }
 */

import { appendAssetVersion } from './release.js';

const DEFAULT_EMBED_MODE = 'standalone';
const KNOWN_EMBED_MODES = Object.freeze(['standalone', 'embedded', 'assets-only']);

function parseBooleanToken(value, fallbackValue) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
    return true;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') {
    return false;
  }

  return fallbackValue;
}

function normalizeEmbedMode(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  if (KNOWN_EMBED_MODES.includes(normalized)) {
    return normalized;
  }

  return DEFAULT_EMBED_MODE;
}

function hasScheme(value) {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value);
}

function normalizeBaseUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '/';
  }

  if (hasScheme(raw)) {
    return raw.endsWith('/') ? raw : `${raw}/`;
  }

  let normalized = raw.startsWith('/') ? raw : `/${raw}`;
  normalized = normalized.replace(/\/{2,}/g, '/');
  if (!normalized.endsWith('/')) {
    normalized = `${normalized}/`;
  }

  return normalized;
}

function trimLeadingSlash(value) {
  return String(value ?? '').replace(/^\/+/, '');
}

function trimTrailingSlash(value) {
  return String(value ?? '').replace(/\/+$/, '');
}

function isExternalUrl(url) {
  return /^https?:\/\//i.test(url);
}

export function readRuntimeConfig({ documentRef = globalThis.document, overrides = {} } = {}) {
  const root = documentRef?.documentElement;
  const metaEmbedMode =
    documentRef?.querySelector('meta[name="spw:embed-mode"]')?.getAttribute('content') ?? '';
  const metaBaseUrl =
    documentRef?.querySelector('meta[name="spw:base-url"]')?.getAttribute('content') ?? '';
  const metaAutoMount =
    documentRef?.querySelector('meta[name="spw:auto-mount"]')?.getAttribute('content') ?? '';
  const metaServiceWorker =
    documentRef?.querySelector('meta[name="spw:sw-enabled"]')?.getAttribute('content') ?? '';

  const embedMode = normalizeEmbedMode(
    overrides.embedMode ?? overrides.mode ?? metaEmbedMode ?? root?.dataset?.spwEmbedMode
  );
  const baseUrl = normalizeBaseUrl(
    overrides.baseUrl ?? metaBaseUrl ?? root?.dataset?.spwBaseUrl ?? '/'
  );
  const autoMount = parseBooleanToken(overrides.autoMount ?? metaAutoMount, true);
  const enableServiceWorker = parseBooleanToken(
    overrides.enableServiceWorker ?? metaServiceWorker,
    embedMode === 'standalone'
  );
  const runEnhancements = parseBooleanToken(overrides.runEnhancements, true);
  const mountSelector = String(overrides.mountSelector ?? '').trim();

  return Object.freeze({
    embedMode,
    baseUrl,
    autoMount,
    enableServiceWorker,
    runEnhancements,
    mountSelector
  });
}

export function resolveRuntimeAssetUrl(path, runtimeConfig = {}, { assetVersion = '' } = {}) {
  if (typeof path !== 'string' || path.length === 0) {
    return path;
  }

  if (path.startsWith('#') || path.startsWith('mailto:') || path.startsWith('data:')) {
    return path;
  }

  const baseUrl = normalizeBaseUrl(runtimeConfig.baseUrl ?? '/');
  let resolved = path;

  if (!hasScheme(path)) {
    const relativePath = path.startsWith('/') ? trimLeadingSlash(path) : path.replace(/^\.\//, '');

    if (isExternalUrl(baseUrl)) {
      const originBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      resolved = new URL(relativePath, originBase).toString();
    } else if (baseUrl === '/') {
      resolved = `/${relativePath}`;
    } else {
      resolved = `${trimTrailingSlash(baseUrl)}/${relativePath}`;
    }
  }

  return appendAssetVersion(resolved, assetVersion);
}

