export const PHASE_ORDER = Object.freeze(['seed', 'pulse', 'counterpoint', 'chorus']);
const PHASE_WEIGHTS = Object.freeze({ seed: 0, pulse: 1, counterpoint: 2, chorus: 3 });

export function clampNonNegativeInteger(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

export function phaseFromClickCount(clickCount) {
  const count = clampNonNegativeInteger(clickCount);

  if (count <= 2) {
    return 'seed';
  }

  if (count <= 7) {
    return 'pulse';
  }

  if (count <= 15) {
    return 'counterpoint';
  }

  return 'chorus';
}

export function phaseWeight(phase) {
  return PHASE_WEIGHTS[phase] ?? 0;
}

export function unlockedLayersFromPhase(phase) {
  const layers = ['geometry'];

  if (phaseWeight(phase) >= phaseWeight('pulse')) {
    layers.push('motion');
  }

  if (phaseWeight(phase) >= phaseWeight('counterpoint')) {
    layers.push('fragments');
  }

  if (phaseWeight(phase) >= phaseWeight('chorus')) {
    layers.push('highlights');
  }

  return Object.freeze(layers);
}

export function intensityFromPhase(phase) {
  return phaseWeight(phase);
}

export function detectReducedMotionPreference(win = globalThis.window) {
  if (!win || typeof win.matchMedia !== 'function') {
    return false;
  }

  return win.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function watchReducedMotionPreference(win = globalThis.window, onChange = () => {}) {
  if (!win || typeof win.matchMedia !== 'function') {
    return () => {};
  }

  const query = win.matchMedia('(prefers-reduced-motion: reduce)');
  const handleChange = (event) => onChange(Boolean(event.matches));

  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }

  query.addListener(handleChange);
  return () => query.removeListener(handleChange);
}
