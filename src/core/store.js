/**
 * Intent:
 * Hold app state transitions in one immutable store so UI behavior remains deterministic and testable.
 * Invariants:
 * State snapshots are frozen and clickCount drives phase/layer derivation without side effects.
 * How this composes with neighbors:
 * Boot owns the store lifecycle; components subscribe and dispatch intent events rather than mutating directly.
 */

import { phaseFromClickCount, unlockedLayersFromPhase } from './motion.js';
import { coerceRoute } from './router-lite.js';

/**
 * @typedef {'seed' | 'pulse' | 'counterpoint' | 'chorus'} PhaseName
 */

/**
 * @typedef {'home' | 'work' | 'notes'} RouteName
 */

/**
 * @typedef {Object} AppState
 * @property {number} clickCount
 * @property {PhaseName} phase
 * @property {ReadonlyArray<string>} unlockedLayers
 * @property {boolean} reducedMotion
 * @property {RouteName} activeRoute
 * @property {string} lastClickSource
 */

function freezeState(candidateState) {
  return Object.freeze({
    clickCount: candidateState.clickCount,
    phase: candidateState.phase,
    unlockedLayers: Object.freeze([...candidateState.unlockedLayers]),
    reducedMotion: candidateState.reducedMotion,
    activeRoute: candidateState.activeRoute,
    lastClickSource: candidateState.lastClickSource
  });
}

function normalizeState(candidateState) {
  const clickCount = Number.isFinite(candidateState.clickCount)
    ? Math.max(0, Math.floor(candidateState.clickCount))
    : 0;
  const phase = phaseFromClickCount(clickCount);

  return freezeState({
    clickCount,
    phase,
    unlockedLayers: unlockedLayersFromPhase(phase),
    reducedMotion: Boolean(candidateState.reducedMotion),
    activeRoute: coerceRoute(candidateState.activeRoute),
    lastClickSource: candidateState.lastClickSource ?? 'bootstrap'
  });
}

function areArraysEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

function areStatesEqual(left, right) {
  return (
    left.clickCount === right.clickCount &&
    left.phase === right.phase &&
    left.reducedMotion === right.reducedMotion &&
    left.activeRoute === right.activeRoute &&
    left.lastClickSource === right.lastClickSource &&
    areArraysEqual(left.unlockedLayers, right.unlockedLayers)
  );
}

export function createInitialState(seed = {}) {
  return normalizeState({
    clickCount: 0,
    phase: 'seed',
    unlockedLayers: ['geometry'],
    reducedMotion: false,
    activeRoute: 'home',
    lastClickSource: 'bootstrap',
    ...seed
  });
}

export function createStore(seedState = {}) {
  let state = createInitialState(seedState);
  const listeners = new Set();

  function notify(nextState, previousState, reason) {
    for (const listener of listeners) {
      listener(nextState, previousState, reason);
    }
  }

  function commit(candidateState, reason) {
    if (areStatesEqual(state, candidateState)) {
      return state;
    }

    const previousState = state;
    state = candidateState;
    notify(state, previousState, reason);
    return state;
  }

  return {
    getState() {
      return state;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    update(recipe, reason = 'update') {
      const draft = {
        ...state,
        unlockedLayers: [...state.unlockedLayers]
      };
      const recipeResult = recipe(draft, state);
      const nextState = normalizeState(recipeResult ?? draft);
      return commit(nextState, reason);
    },

    setRoute(routeName) {
      return this.update((draft) => {
        draft.activeRoute = coerceRoute(routeName);
      }, 'route:set');
    },

    setReducedMotion(reducedMotionEnabled) {
      return this.update((draft) => {
        draft.reducedMotion = Boolean(reducedMotionEnabled);
      }, 'motion:set');
    },

    registerClick(source = 'unknown') {
      return this.update((draft) => {
        draft.clickCount += 1;
        draft.lastClickSource = source;
      }, 'click:intent');
    },

    resetClickCount() {
      return this.update((draft) => {
        draft.clickCount = 0;
        draft.lastClickSource = 'reset';
      }, 'click:reset');
    }
  };
}
