import { appendAssetVersion } from '../release.js';
import {
  DEFAULT_COMPACT_BREAKPOINT,
  DEFAULT_MOBILE_BREAKPOINT,
  DEFAULT_SPACE_MODE,
  DEFAULT_VIEWPORT_MODE,
  normalizeSpaceMode,
  normalizeViewportMode
} from '../viewport/space.js';

const DEFAULT_EMBED_MODE = 'standalone';
const KNOWN_EMBED_MODES = Object.freeze(['standalone', 'embedded', 'assets-only']);
const DEFAULT_HOST_ID = 'spwashi.click';

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

function normalizeHostToken(value, fallbackValue = '') {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');

  if (normalized.length === 0) {
    return fallbackValue;
  }

  return normalized;
}

function normalizeHostVersion(value) {
  return String(value ?? '').trim();
}

function normalizePathToken(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : '';
}

function normalizeBreakpoint(value, fallbackValue) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 320 || parsed > 2400) {
    return fallbackValue;
  }

  return parsed;
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
  const metaHostId =
    documentRef?.querySelector('meta[name="spw:host-id"]')?.getAttribute('content') ?? '';
  const metaHostVersion =
    documentRef?.querySelector('meta[name="spw:host-version"]')?.getAttribute('content') ?? '';
  const metaHostManifest =
    documentRef?.querySelector('meta[name="spw:host-manifest"]')?.getAttribute('content') ?? '';
  const metaHostManifestRequired =
    documentRef?.querySelector('meta[name="spw:host-manifest-required"]')?.getAttribute('content') ?? '';
  const metaHostEnhancementManifest =
    documentRef?.querySelector('meta[name="spw:host-enhancements-manifest"]')?.getAttribute('content') ?? '';
  const metaViewportMode =
    documentRef?.querySelector('meta[name="spw:viewport-mode"]')?.getAttribute('content') ?? '';
  const metaSpaceMode =
    documentRef?.querySelector('meta[name="spw:space-mode"]')?.getAttribute('content') ?? '';
  const metaMobileBreakpoint =
    documentRef?.querySelector('meta[name="spw:mobile-breakpoint"]')?.getAttribute('content') ?? '';
  const metaCompactBreakpoint =
    documentRef?.querySelector('meta[name="spw:compact-breakpoint"]')?.getAttribute('content') ?? '';

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
  const hostId = normalizeHostToken(
    overrides.hostId ?? overrides.host ?? metaHostId ?? root?.dataset?.spwHostId,
    DEFAULT_HOST_ID
  );
  const hostVersion = normalizeHostVersion(
    overrides.hostVersion ?? metaHostVersion ?? root?.dataset?.spwHostVersion ?? ''
  );
  const hostManifestPath = normalizePathToken(
    overrides.hostManifestPath ?? metaHostManifest ?? root?.dataset?.spwHostManifest ?? ''
  );
  const hostManifestRequired = parseBooleanToken(
    overrides.hostManifestRequired ?? metaHostManifestRequired ?? root?.dataset?.spwHostManifestRequired,
    false
  );
  const hostEnhancementManifestPath = normalizePathToken(
    overrides.hostEnhancementManifestPath ??
      overrides.hostEnhancementsManifestPath ??
      metaHostEnhancementManifest ??
      root?.dataset?.spwHostEnhancementsManifest ??
      ''
  );
  const viewportMode = normalizeViewportMode(
    overrides.viewportMode ?? metaViewportMode ?? root?.dataset?.spwViewportMode
  );
  const spaceMode = normalizeSpaceMode(
    overrides.spaceMode ?? metaSpaceMode ?? root?.dataset?.spwSpaceMode,
    DEFAULT_SPACE_MODE
  );
  const mobileBreakpoint = normalizeBreakpoint(
    overrides.mobileBreakpoint ?? metaMobileBreakpoint ?? root?.dataset?.spwMobileBreakpoint,
    DEFAULT_MOBILE_BREAKPOINT
  );
  const compactBreakpoint = normalizeBreakpoint(
    overrides.compactBreakpoint ?? metaCompactBreakpoint ?? root?.dataset?.spwCompactBreakpoint,
    DEFAULT_COMPACT_BREAKPOINT
  );

  return Object.freeze({
    embedMode,
    baseUrl,
    autoMount,
    enableServiceWorker,
    runEnhancements,
    mountSelector,
    hostId,
    hostVersion,
    hostManifestPath,
    hostManifestRequired,
    hostEnhancementManifestPath,
    viewportMode,
    spaceMode,
    mobileBreakpoint,
    compactBreakpoint
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
