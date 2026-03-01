/**
 * Intent:
 * Provide low-frequency element space sampling so components can adapt to their local geometry without heavy layout thrash.
 * Invariants:
 * Samples are normalized and banded deterministically, and cleanup always detaches observers/timers.
 * How this composes with neighbors:
 * Components and optional enhancements consume these helpers to project size bands into data attributes and CSS variables.
 */

const INLINE_BREAKPOINTS = Object.freeze([360, 560, 800, 1100]);
const INLINE_BANDS = Object.freeze(['nano', 'compact', 'medium', 'wide', 'immersive']);

const BLOCK_BREAKPOINTS = Object.freeze([220, 360, 520]);
const BLOCK_BANDS = Object.freeze(['short', 'balanced', 'tall', 'tower']);

const AREA_BREAKPOINTS = Object.freeze([120000, 250000, 420000]);
const AREA_BANDS = Object.freeze(['seed', 'panel', 'field', 'stage']);

function sanitizeDimension(value) {
  const parsed = Number.parseFloat(String(value));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.round(parsed);
}

function bandFromBreakpoints(value, breakpoints, bands) {
  for (let index = 0; index < breakpoints.length; index += 1) {
    if (value < breakpoints[index]) {
      return bands[index];
    }
  }

  return bands[bands.length - 1];
}

function hasMeaningfulDelta(previousSample, nextSample, minDelta) {
  if (!previousSample) {
    return true;
  }

  if (Math.abs(nextSample.width - previousSample.width) >= minDelta) {
    return true;
  }

  if (Math.abs(nextSample.height - previousSample.height) >= minDelta) {
    return true;
  }

  return (
    nextSample.inlineBand !== previousSample.inlineBand ||
    nextSample.blockBand !== previousSample.blockBand ||
    nextSample.areaBand !== previousSample.areaBand
  );
}

export function sampleElementSpace(node) {
  if (!node || typeof node.getBoundingClientRect !== 'function') {
    return Object.freeze({
      width: 0,
      height: 0,
      area: 0,
      aspectRatio: 0,
      inlineBand: 'nano',
      blockBand: 'short',
      areaBand: 'seed'
    });
  }

  const rect = node.getBoundingClientRect();
  const width = sanitizeDimension(rect.width);
  const height = sanitizeDimension(rect.height);
  const area = width * height;

  return Object.freeze({
    width,
    height,
    area,
    aspectRatio: height > 0 ? Number((width / height).toFixed(3)) : 0,
    inlineBand: bandFromBreakpoints(width, INLINE_BREAKPOINTS, INLINE_BANDS),
    blockBand: bandFromBreakpoints(height, BLOCK_BREAKPOINTS, BLOCK_BANDS),
    areaBand: bandFromBreakpoints(area, AREA_BREAKPOINTS, AREA_BANDS)
  });
}

export function installSporadicSpaceSampler({
  node,
  onSample,
  windowRef = globalThis.window,
  intervalMs = 2200,
  minDelta = 8
} = {}) {
  if (!node || typeof onSample !== 'function') {
    return () => {};
  }

  const safeInterval = Number.isFinite(intervalMs)
    ? Math.max(700, Math.floor(intervalMs))
    : 2200;
  const safeDelta = Number.isFinite(minDelta) ? Math.max(1, Math.floor(minDelta)) : 8;
  let lastSample = null;

  const publish = (reason) => {
    const nextSample = sampleElementSpace(node);
    if (!hasMeaningfulDelta(lastSample, nextSample, safeDelta) && reason !== 'init') {
      return;
    }

    lastSample = nextSample;
    onSample(nextSample, reason);
  };

  const timerId =
    windowRef && typeof windowRef.setInterval === 'function'
      ? windowRef.setInterval(() => {
          publish('interval');
        }, safeInterval)
      : null;

  const ResizeObserverCtor = windowRef?.ResizeObserver ?? globalThis.ResizeObserver;
  const observer =
    typeof ResizeObserverCtor === 'function'
      ? new ResizeObserverCtor(() => {
          publish('resize');
        })
      : null;

  if (observer) {
    observer.observe(node);
  }

  publish('init');

  return () => {
    if (timerId !== null && windowRef && typeof windowRef.clearInterval === 'function') {
      windowRef.clearInterval(timerId);
    }

    observer?.disconnect();
  };
}
