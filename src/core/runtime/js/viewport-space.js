export const DEFAULT_VIEWPORT_MODE = 'adaptive';
export const DEFAULT_MOBILE_BREAKPOINT = 900;
export const DEFAULT_COMPACT_BREAKPOINT = 640;
export const DEFAULT_SPACE_MODE = 'adaptive';

const KNOWN_VIEWPORT_MODES = Object.freeze(['adaptive', 'fixed']);
const KNOWN_VIEWPORT_BANDS = Object.freeze(['nano', 'compact', 'immersive']);
const KNOWN_ASPECT_BANDS = Object.freeze(['portrait', 'square', 'landscape']);
const KNOWN_SPACE_MODES = Object.freeze(['adaptive', 'compact', 'balanced', 'expansive']);
const KNOWN_SPACE_LAYERS = Object.freeze(['stack', 'nested', 'spread']);

function toFiniteNumber(value, fallbackValue = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallbackValue;
  }

  return parsed;
}

function normalizeToken(value, knownTokens, fallbackValue) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  if (knownTokens.includes(normalized)) {
    return normalized;
  }

  return fallbackValue;
}

function normalizeBreakpoint(value, fallbackValue) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 320 || parsed > 2400) {
    return fallbackValue;
  }

  return parsed;
}

function deriveSpaceMode({ requestedSpaceMode, band, width, height, aspect }) {
  if (requestedSpaceMode !== DEFAULT_SPACE_MODE) {
    return requestedSpaceMode;
  }

  const area = width * height;
  const shortEdge = Math.min(width, height);

  if (band === 'nano' || shortEdge < 390 || area < 230000) {
    return 'compact';
  }

  if (band === 'immersive' && area >= 880000 && aspect === 'landscape') {
    return 'expansive';
  }

  return 'balanced';
}

function deriveSpaceLayer({ spaceMode, band, width, height, aspect }) {
  if (spaceMode === 'compact' || band === 'nano' || height < 560) {
    return 'stack';
  }

  if (
    spaceMode === 'expansive' ||
    (band === 'immersive' && aspect === 'landscape' && width >= 1040 && height >= 620)
  ) {
    return 'spread';
  }

  return 'nested';
}

export function normalizeViewportMode(value, fallbackValue = DEFAULT_VIEWPORT_MODE) {
  return normalizeToken(value, KNOWN_VIEWPORT_MODES, fallbackValue);
}

export function normalizeViewportBand(value, fallbackValue = 'immersive') {
  return normalizeToken(value, KNOWN_VIEWPORT_BANDS, fallbackValue);
}

export function normalizeAspectBand(value, fallbackValue = 'square') {
  return normalizeToken(value, KNOWN_ASPECT_BANDS, fallbackValue);
}

export function normalizeSpaceMode(value, fallbackValue = DEFAULT_SPACE_MODE) {
  return normalizeToken(value, KNOWN_SPACE_MODES, fallbackValue);
}

export function normalizeSpaceLayer(value, fallbackValue = 'nested') {
  return normalizeToken(value, KNOWN_SPACE_LAYERS, fallbackValue);
}

export function resolveAspectBand(width, height) {
  if (width <= 0 || height <= 0) {
    return 'square';
  }

  const ratio = width / height;
  if (ratio >= 1.18) {
    return 'landscape';
  }

  if (ratio <= 0.84) {
    return 'portrait';
  }

  return 'square';
}

export function resolveViewportBand(
  width,
  {
    mobileBreakpoint = DEFAULT_MOBILE_BREAKPOINT,
    compactBreakpoint = DEFAULT_COMPACT_BREAKPOINT
  } = {}
) {
  if (width <= compactBreakpoint) {
    return 'nano';
  }

  if (width <= mobileBreakpoint) {
    return 'compact';
  }

  return 'immersive';
}

export function resolveViewportSpace(input = {}) {
  const width = Math.max(0, Math.round(toFiniteNumber(input.width, 0)));
  const height = Math.max(0, Math.round(toFiniteNumber(input.height, 0)));
  const mobileBreakpoint = normalizeBreakpoint(
    input.mobileBreakpoint,
    DEFAULT_MOBILE_BREAKPOINT
  );
  const compactBreakpoint = normalizeBreakpoint(
    input.compactBreakpoint,
    DEFAULT_COMPACT_BREAKPOINT
  );

  const mode = normalizeViewportMode(
    input.mode ?? input.viewportMode,
    DEFAULT_VIEWPORT_MODE
  );
  const explicitBand = normalizeViewportBand(input.band, '');
  const band = explicitBand || resolveViewportBand(width, { mobileBreakpoint, compactBreakpoint });
  const mobile =
    typeof input.mobile === 'boolean'
      ? input.mobile
      : band === 'nano' || band === 'compact';
  const explicitAspect = normalizeAspectBand(input.aspect, '');
  const aspect = explicitAspect || resolveAspectBand(width, height);
  const requestedSpaceMode = normalizeSpaceMode(
    input.spaceMode ?? input.space,
    DEFAULT_SPACE_MODE
  );
  const spaceMode = deriveSpaceMode({
    requestedSpaceMode,
    band,
    width,
    height,
    aspect
  });
  const explicitSpaceLayer = normalizeSpaceLayer(input.spaceLayer ?? input.layer, '');
  const spaceLayer =
    explicitSpaceLayer ||
    deriveSpaceLayer({
      spaceMode,
      band,
      width,
      height,
      aspect
    });
  const area = width * height;

  return Object.freeze({
    mode,
    band,
    mobile,
    width,
    height,
    area,
    aspect,
    spaceMode,
    spaceLayer,
    mobileBreakpoint,
    compactBreakpoint
  });
}
