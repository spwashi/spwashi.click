/**
 * ^intent:
 * ^intent[module]{ id:core.events mode:spwlang surface:web }
 * ^invariants:
 * ^invariant[form]{ determinism:locked contracts:explicit sidefx:bounded }
 * ^invariant[state]{ mutation:public-api projection:data+aria }
 * ^compose:
 * ^compose[neighbors]{ ingress:imports egress:exports bridge:event+store }
 */

export const EVENT_INTENT_CLICK = 'spw:intent:click';
export const EVENT_STATE_CHANGED = 'spw:state:changed';
export const EVENT_PHASE_CHANGED = 'spw:phase:changed';
export const EVENT_NAVIGATE = 'spw:navigate';
export const EVENT_APP_READY = 'spw:app:ready';
export const EVENT_ECOLOGY_CHANGED = 'spw:ecology:changed';
export const EVENT_ENHANCEMENT_LOADED = 'spw:enhancement:loaded';
export const EVENT_ENHANCEMENT_FAILED = 'spw:enhancement:failed';
export const EVENT_PWA_STATE_CHANGED = 'spw:pwa:state-changed';

export const KNOWN_EVENT_NAMES = Object.freeze([
  EVENT_INTENT_CLICK,
  EVENT_STATE_CHANGED,
  EVENT_PHASE_CHANGED,
  EVENT_NAVIGATE,
  EVENT_APP_READY,
  EVENT_ECOLOGY_CHANGED,
  EVENT_ENHANCEMENT_LOADED,
  EVENT_ENHANCEMENT_FAILED,
  EVENT_PWA_STATE_CHANGED
]);

export function isKnownEventName(eventName) {
  return KNOWN_EVENT_NAMES.includes(eventName);
}

export function freezeDetail(detail = {}) {
  return Object.freeze({ ...detail });
}

export function createTypedEvent(eventName, detail = {}, init = {}) {
  const frozenDetail = freezeDetail(detail);
  const eventInit = {
    bubbles: true,
    composed: true,
    cancelable: false,
    ...init,
    detail: frozenDetail
  };

  if (typeof CustomEvent === 'function') {
    return new CustomEvent(eventName, eventInit);
  }

  const fallbackEvent = new Event(eventName, eventInit);
  fallbackEvent.detail = frozenDetail;
  return fallbackEvent;
}

export function dispatchTypedEvent(target, eventName, detail = {}, init = {}) {
  if (!target || typeof target.dispatchEvent !== 'function') {
    throw new TypeError('dispatchTypedEvent target must implement dispatchEvent');
  }

  const typedEvent = createTypedEvent(eventName, detail, init);
  target.dispatchEvent(typedEvent);
  return typedEvent;
}

export function subscribeTypedEvent(target, eventName, listener, options) {
  target.addEventListener(eventName, listener, options);
  return () => target.removeEventListener(eventName, listener, options);
}
