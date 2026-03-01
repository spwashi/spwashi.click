/**
 * Intent:
 * Provide an explicit runtime control API so LLM agents can manipulate top-level state, regions, components, and CSS variables.
 * Invariants:
 * Control operations are deterministic, bounded to requested selectors, and return snapshots after every mutation.
 * How this composes with neighbors:
 * Boot installs this API once; store/controllers remain authoritative while control methods proxy into their public interfaces.
 */

import { SPW_FEATURE_CATALOG, summarizeFeatureCatalog } from '../content/feature-catalog.js';
import { runSpwRuntimeCommand } from './spw-command-surface.js';

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function applyNodeParameters(node, params = {}) {
  if (!node || !isObject(params)) {
    return;
  }

  if (isObject(params.attributes)) {
    for (const [name, value] of Object.entries(params.attributes)) {
      if (value === null || value === undefined || value === false) {
        node.removeAttribute(name);
      } else {
        node.setAttribute(name, String(value));
      }
    }
  }

  if (isObject(params.dataset)) {
    for (const [name, value] of Object.entries(params.dataset)) {
      if (value === null || value === undefined || value === false) {
        delete node.dataset[name];
      } else {
        node.dataset[name] = String(value);
      }
    }
  }

  if (isObject(params.style)) {
    for (const [name, value] of Object.entries(params.style)) {
      if (value === null || value === undefined || value === false) {
        node.style.removeProperty(name);
      } else {
        node.style.setProperty(name, String(value));
      }
    }
  }

  if (typeof params.text === 'string') {
    node.textContent = params.text;
  }
}

function clampCount(value) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

export function installRuntimeControl({ app, document, window, rebindPage }) {
  if (!app || !document || !window) {
    return () => {};
  }

  const root = document.documentElement;

  function getSnapshot() {
    return {
      route: app.store.getState().activeRoute,
      state: app.store.getState(),
      ecology: app.ecology.getSnapshot(),
      release: app.releaseMeta,
      performanceProfile: app.performanceController.getProfile(),
      llmReadableStructure: app.structureController.enabled,
      textureTunerState: root.dataset.textureTunerState ?? 'unknown',
      catalogVersion: SPW_FEATURE_CATALOG.version
    };
  }

  function getCatalog(options = {}) {
    if (!isObject(options)) {
      return SPW_FEATURE_CATALOG;
    }

    if (options.summaryOnly === true) {
      return summarizeFeatureCatalog();
    }

    return SPW_FEATURE_CATALOG;
  }

  function setTopLevel(config = {}) {
    if (typeof config.route === 'string') {
      app.store.setRoute(config.route);
    }

    if (typeof config.reducedMotion === 'boolean') {
      app.store.setReducedMotion(config.reducedMotion);
    }

    if (typeof config.performanceProfile === 'string') {
      app.performanceController.setProfile(config.performanceProfile);
    }

    if (typeof config.llmReadableStructure === 'boolean') {
      app.structureController.setEnabled(config.llmReadableStructure);
    }

    if (config.clickCount !== undefined) {
      const clickCount = clampCount(config.clickCount);
      app.store.update((draft) => {
        draft.clickCount = clickCount;
      }, 'runtime:click-count:set');
    }

    return getSnapshot();
  }

  function setRegion({ selector, params = {}, all = false } = {}) {
    if (typeof selector !== 'string' || selector.length === 0) {
      return { matched: 0, snapshot: getSnapshot() };
    }

    const nodes = Array.from(document.querySelectorAll(selector));
    const targetNodes = all ? nodes : nodes.slice(0, 1);
    for (const node of targetNodes) {
      applyNodeParameters(node, params);
    }

    return { matched: targetNodes.length, snapshot: getSnapshot() };
  }

  function setComponent({ selector, tagName, params = {}, all = false } = {}) {
    const resolvedSelector =
      typeof selector === 'string' && selector.length > 0
        ? selector
        : typeof tagName === 'string' && tagName.length > 0
          ? tagName
          : '';

    if (!resolvedSelector) {
      return { matched: 0, snapshot: getSnapshot() };
    }

    return setRegion({ selector: resolvedSelector, params, all });
  }

  function setWindowVars(variables = {}) {
    if (!isObject(variables)) {
      return getSnapshot();
    }

    for (const [name, value] of Object.entries(variables)) {
      if (!name.startsWith('--')) {
        continue;
      }

      if (value === null || value === undefined || value === false) {
        root.style.removeProperty(name);
      } else {
        root.style.setProperty(name, String(value));
      }
    }

    return getSnapshot();
  }

  function resetRuntime(config = {}) {
    app.store.resetClickCount();

    if (typeof config.route === 'string') {
      app.store.setRoute(config.route);
    }

    app.performanceController.setProfile(config.performanceProfile ?? 'field');
    app.structureController.setEnabled(Boolean(config.llmReadableStructure ?? false));

    root.style.removeProperty('--fx-drift-x');
    root.style.removeProperty('--fx-drift-y');
    root.style.removeProperty('--fx-lumen-angle');

    app.marginalia.write('runtime', 'runtime-control reset', {
      route: config.route ?? app.store.getState().activeRoute,
      performanceProfile: config.performanceProfile ?? 'field'
    });

    return getSnapshot();
  }

  function rebindRuntime() {
    rebindPage?.();
    app.store.update((draft) => draft, 'runtime:rebind');
    window.dispatchEvent(new Event('spw:runtime:rebind'));

    app.marginalia.write('runtime', 'runtime-control rebind', {
      route: app.store.getState().activeRoute
    });

    return getSnapshot();
  }

  function evalSpw(expression = '') {
    return runSpwRuntimeCommand({
      expression,
      runtimeApi
    });
  }

  const runtimeApi = {
    version: '1.0.0',
    getSnapshot,
    getCatalog,
    setTopLevel,
    setRegion,
    setComponent,
    setWindowVars,
    resetRuntime,
    rebindRuntime,
    evalSpw,
    run(method, payload = {}) {
      if (method === 'reset') {
        return resetRuntime(payload);
      }

      if (method === 'rebind') {
        return rebindRuntime();
      }

      if (method === 'setTopLevel') {
        return setTopLevel(payload);
      }

      if (method === 'setRegion') {
        return setRegion(payload);
      }

      if (method === 'setComponent') {
        return setComponent(payload);
      }

      if (method === 'setWindowVars') {
        return setWindowVars(payload);
      }

      if (method === 'spw' || method === 'evalSpw') {
        const expression = typeof payload === 'string' ? payload : payload.expression;
        return evalSpw(expression ?? '');
      }

      if (method === 'catalog' || method === 'getCatalog') {
        return getCatalog(payload);
      }

      return {
        error: `Unknown runtime method: ${method}`,
        snapshot: getSnapshot()
      };
    }
  };

  window.__SPW_RUNTIME__ = runtimeApi;
  window.spwRuntime = runtimeApi;

  return () => {
    if (window.__SPW_RUNTIME__ === runtimeApi) {
      delete window.__SPW_RUNTIME__;
    }

    if (window.spwRuntime === runtimeApi) {
      delete window.spwRuntime;
    }
  };
}
