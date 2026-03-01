/**
 * ^intent:
 * ^intent[module]{ id:core.release mode:spwlang surface:web }
 * ^invariants:
 * ^invariant[form]{ determinism:locked contracts:explicit sidefx:bounded }
 * ^invariant[state]{ mutation:public-api projection:data+aria }
 * ^compose:
 * ^compose[neighbors]{ ingress:imports egress:exports bridge:event+store }
 */

const DEFAULT_RELEASE_DATE = new Date().toISOString().slice(0, 10);
const DEFAULT_RELEASE_ID = 'r0';
const DEFAULT_RELEASE_ARC = 'baseline';
const DEFAULT_RELEASE_VIBE = 'steady';
const DEFAULT_ASSET_VERSION = `${DEFAULT_RELEASE_DATE.replace(/-/g, '')}-${DEFAULT_RELEASE_ARC}-${DEFAULT_RELEASE_VIBE}-${DEFAULT_RELEASE_ID}`;

function normalizeReleaseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return DEFAULT_RELEASE_DATE;
  }

  return value;
}

function normalizeReleaseId(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return DEFAULT_RELEASE_ID;
  }

  return value;
}

function normalizeToken(value, fallback) {
  if (typeof value !== 'string' || value.length === 0) {
    return fallback;
  }

  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
}

function normalizeAssetVersion(value, releaseDate, releaseId, releaseArc, releaseVibe) {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  return `${releaseDate.replace(/-/g, '')}-${releaseArc}-${releaseVibe}-${releaseId}`;
}

export function appendAssetVersion(url, assetVersion) {
  if (typeof url !== 'string' || url.length === 0) {
    return url;
  }

  if (!assetVersion || url.startsWith('mailto:') || url.startsWith('#')) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${encodeURIComponent(assetVersion)}`;
}

export function readReleaseMeta(documentRef = globalThis.document) {
  const releaseDate = normalizeReleaseDate(
    documentRef?.querySelector('meta[name="spw:release-date"]')?.getAttribute('content')
  );
  const releaseId = normalizeReleaseId(
    documentRef?.querySelector('meta[name="spw:release-id"]')?.getAttribute('content')
  );
  const releaseArc = normalizeToken(
    documentRef?.querySelector('meta[name="spw:release-arc"]')?.getAttribute('content'),
    DEFAULT_RELEASE_ARC
  );
  const releaseVibe = normalizeToken(
    documentRef?.querySelector('meta[name="spw:release-vibe"]')?.getAttribute('content'),
    DEFAULT_RELEASE_VIBE
  );
  const assetVersion = normalizeAssetVersion(
    documentRef?.querySelector('meta[name="spw:asset-version"]')?.getAttribute('content'),
    releaseDate,
    releaseId,
    releaseArc,
    releaseVibe
  );

  return Object.freeze({
    releaseDate,
    releaseId,
    releaseArc,
    releaseVibe,
    assetVersion: assetVersion || DEFAULT_ASSET_VERSION
  });
}
