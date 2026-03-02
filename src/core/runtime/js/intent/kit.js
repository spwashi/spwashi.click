import { noteComponentLifecycle } from '../ecology.js';
import { EVENT_INTENT_CLICK, dispatchTypedEvent } from '../events.js';

const DEFAULT_TAP_MAX_DURATION_MS = 460;
const DEFAULT_TAP_MAX_DISTANCE_PX = 18;

function toNumber(value, fallbackValue) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
}

function distanceBetweenPoints(a, b) {
  if (!a || !b) {
    return Infinity;
  }

  const deltaX = toNumber(a.clientX, 0) - toNumber(b.clientX, 0);
  const deltaY = toNumber(a.clientY, 0) - toNumber(b.clientY, 0);
  return Math.hypot(deltaX, deltaY);
}

function nowMs() {
  return Date.now();
}

export function triggerHapticPulse(win = globalThis.window, durationMs = 10) {
  const duration = Math.max(0, Math.floor(toNumber(durationMs, 10)));
  if (duration === 0) {
    return false;
  }

  try {
    if (typeof win?.navigator?.vibrate === 'function') {
      return win.navigator.vibrate(duration) === true;
    }
  } catch {
    return false;
  }

  return false;
}

export function emitIntentClick(
  target,
  { source = 'unknown', lifecycleTag = '', detail = {}, haptic = true } = {}
) {
  const payload = {
    source,
    ...(detail && typeof detail === 'object' ? detail : {})
  };

  dispatchTypedEvent(target, EVENT_INTENT_CLICK, payload);

  if (lifecycleTag) {
    noteComponentLifecycle(lifecycleTag, 'intent', payload);
  }

  if (haptic) {
    triggerHapticPulse();
  }

  return payload;
}

export function createTapTracker({
  maxDurationMs = DEFAULT_TAP_MAX_DURATION_MS,
  maxDistancePx = DEFAULT_TAP_MAX_DISTANCE_PX
} = {}) {
  const durationThreshold = Math.max(120, Math.floor(toNumber(maxDurationMs, DEFAULT_TAP_MAX_DURATION_MS)));
  const distanceThreshold = Math.max(4, toNumber(maxDistancePx, DEFAULT_TAP_MAX_DISTANCE_PX));

  let startPoint = null;

  function reset() {
    startPoint = null;
  }

  function start(event) {
    startPoint = {
      at: nowMs(),
      pointerId: event?.pointerId,
      clientX: toNumber(event?.clientX, 0),
      clientY: toNumber(event?.clientY, 0)
    };
  }

  function isTap(event) {
    if (!startPoint) {
      return false;
    }

    if (
      event?.pointerId !== undefined &&
      startPoint.pointerId !== undefined &&
      event.pointerId !== startPoint.pointerId
    ) {
      return false;
    }

    const elapsedMs = nowMs() - startPoint.at;
    if (elapsedMs > durationThreshold) {
      return false;
    }

    const distancePx = distanceBetweenPoints(startPoint, event);
    return distancePx <= distanceThreshold;
  }

  return Object.freeze({
    start,
    isTap,
    reset
  });
}
