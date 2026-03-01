import { EVENT_HOST_THEME_CHANGED, dispatchTypedEvent } from './events.js';

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeDatasetKey(value) {
  const sanitized = String(value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '');
  if (!sanitized) {
    return '';
  }

  return sanitized
    .replace(/[-_]+([a-z0-9])/gi, (_match, group) => group.toUpperCase())
    .replace(/^[A-Z]/, (valueToken) => valueToken.toLowerCase());
}

function mediaRuleMatches(media = {}, win = globalThis.window) {
  if (!win) {
    return true;
  }

  if (Number.isFinite(media.minWidth) && Number(win.innerWidth) < Number(media.minWidth)) {
    return false;
  }

  if (Number.isFinite(media.maxWidth) && Number(win.innerWidth) > Number(media.maxWidth)) {
    return false;
  }

  if (media.prefersContrast === 'more') {
    if (typeof win.matchMedia !== 'function' || !win.matchMedia('(prefers-contrast: more)').matches) {
      return false;
    }
  }

  if (media.prefersContrast === 'less') {
    if (typeof win.matchMedia !== 'function' || !win.matchMedia('(prefers-contrast: less)').matches) {
      return false;
    }
  }

  if (typeof media.prefersReducedMotion === 'boolean') {
    if (typeof win.matchMedia !== 'function') {
      return false;
    }
    const matches = win.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (media.prefersReducedMotion !== matches) {
      return false;
    }
  }

  return true;
}

function includesToken(list, token) {
  return Array.isArray(list) && list.includes(token);
}

function themeRuleMatches(rule, context) {
  if (!isObject(rule)) {
    return false;
  }

  if (rule.hosts?.length > 0 && !includesToken(rule.hosts, context.hostId)) {
    return false;
  }

  if (rule.routes?.length > 0 && !includesToken(rule.routes, context.route)) {
    return false;
  }

  if (rule.phases?.length > 0 && !includesToken(rule.phases, context.phase)) {
    return false;
  }

  if (rule.embedModes?.length > 0 && !includesToken(rule.embedModes, context.embedMode)) {
    return false;
  }

  if (!mediaRuleMatches(rule.media, context.window)) {
    return false;
  }

  return true;
}

export function installHostThemeCombinatorics({
  app,
  document,
  window,
  hostManifest
}) {
  if (!app || !document || !window || !isObject(hostManifest)) {
    return {
      state: Object.freeze({
        activeRuleIds: Object.freeze([]),
        tokenCount: 0,
        reason: 'host-theme-disabled'
      }),
      destroy() {}
    };
  }

  const root = document.documentElement;
  const baseTokens = isObject(hostManifest.theming?.baseTokens)
    ? hostManifest.theming.baseTokens
    : {};
  const combinations = Array.isArray(hostManifest.theming?.combinations)
    ? hostManifest.theming.combinations
    : [];

  const appliedTokenNames = new Set();
  const appliedDatasetKeys = new Set();
  const removeMediaWatchers = [];
  let themeState = Object.freeze({
    activeRuleIds: Object.freeze([]),
    tokenCount: 0,
    reason: 'host-theme-ready'
  });

  function clearApplied() {
    for (const tokenName of appliedTokenNames) {
      root.style.removeProperty(tokenName);
    }
    appliedTokenNames.clear();

    for (const datasetKey of appliedDatasetKeys) {
      delete root.dataset[datasetKey];
    }
    appliedDatasetKeys.clear();
  }

  function applyTheme(reason = 'theme:update') {
    const state = app.store.getState();
    const context = {
      hostId: app.runtimeConfig?.hostId ?? 'spwashi.click',
      route: String(state.activeRoute ?? '').toLowerCase(),
      phase: String(state.phase ?? '').toLowerCase(),
      embedMode: String(app.runtimeConfig?.embedMode ?? 'standalone').toLowerCase(),
      window
    };

    const activeRules = combinations.filter((rule) => themeRuleMatches(rule, context));
    const composedTokens = {
      ...baseTokens
    };
    const composedDataset = {};

    for (const rule of activeRules) {
      Object.assign(composedTokens, rule.tokens ?? {});
      Object.assign(composedDataset, rule.dataset ?? {});
    }

    clearApplied();

    for (const [tokenName, value] of Object.entries(composedTokens)) {
      root.style.setProperty(tokenName, String(value));
      appliedTokenNames.add(tokenName);
    }

    for (const [key, value] of Object.entries(composedDataset)) {
      const datasetKey = normalizeDatasetKey(key);
      if (!datasetKey) {
        continue;
      }
      root.dataset[datasetKey] = String(value);
      appliedDatasetKeys.add(datasetKey);
    }

    const activeRuleIds = activeRules.map((rule) => rule.id);
    root.dataset.spwHostThemeState = activeRuleIds.length > 0 ? 'active' : 'base';
    root.dataset.spwHostThemeRules = activeRuleIds.join('|');

    themeState = Object.freeze({
      activeRuleIds: Object.freeze(activeRuleIds),
      tokenCount: Object.keys(composedTokens).length,
      reason
    });

    dispatchTypedEvent(window, EVENT_HOST_THEME_CHANGED, {
      hostId: context.hostId,
      route: context.route,
      phase: context.phase,
      activeRuleIds,
      tokenCount: themeState.tokenCount
    });

    return themeState;
  }

  const unsubscribeStore = app.store.subscribe(() => {
    applyTheme('theme:store-change');
  });
  const onResize = () => {
    applyTheme('theme:resize');
  };
  window.addEventListener('resize', onResize);

  if (typeof window.matchMedia === 'function') {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: more)');

    const onReducedMotionChange = () => applyTheme('theme:reduced-motion-change');
    const onContrastChange = () => applyTheme('theme:contrast-change');

    if (typeof reducedMotionQuery.addEventListener === 'function') {
      reducedMotionQuery.addEventListener('change', onReducedMotionChange);
      removeMediaWatchers.push(() => {
        reducedMotionQuery.removeEventListener('change', onReducedMotionChange);
      });
    }

    if (typeof contrastQuery.addEventListener === 'function') {
      contrastQuery.addEventListener('change', onContrastChange);
      removeMediaWatchers.push(() => {
        contrastQuery.removeEventListener('change', onContrastChange);
      });
    }
  }

  applyTheme('theme:init');

  return {
    getState() {
      return themeState;
    },
    destroy() {
      unsubscribeStore?.();
      window.removeEventListener('resize', onResize);
      for (const removeListener of removeMediaWatchers) {
        removeListener();
      }
      clearApplied();
      delete root.dataset.spwHostThemeState;
      delete root.dataset.spwHostThemeRules;
    }
  };
}
