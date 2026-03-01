import { SPW_FEATURE_CATALOG, summarizeFeatureCatalog } from '../../../content/feature-catalog.js';
import { EVENT_RUNTIME_REBIND, dispatchTypedEvent } from './events.js';
import { createRuntimeApiContract } from './runtime-contract.js';
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

function normalizeInterfaceName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
}

function resolveInterfaceList(payload = {}) {
  if (typeof payload === 'string') {
    return payload.split('|').map((token) => normalizeInterfaceName(token)).filter(Boolean);
  }

  if (Array.isArray(payload)) {
    return payload.map((entry) => normalizeInterfaceName(entry)).filter(Boolean);
  }

  if (isObject(payload)) {
    if (Array.isArray(payload.interfaces)) {
      return payload.interfaces.map((entry) => normalizeInterfaceName(entry)).filter(Boolean);
    }

    if (typeof payload.interface === 'string') {
      return [normalizeInterfaceName(payload.interface)].filter(Boolean);
    }

    if (typeof payload.names === 'string') {
      return payload.names.split('|').map((token) => normalizeInterfaceName(token)).filter(Boolean);
    }
  }

  return [];
}

export function installRuntimeControl({ app, document, window, rebindPage }) {
  if (!app || !document || !window) {
    return () => {};
  }

  const root = document.documentElement;

  function getParserBridgeStatus() {
    const parserBridge = isObject(app.parserBridge) ? app.parserBridge : {};
    return {
      installed: Boolean(parserBridge.installed),
      reason: typeof parserBridge.reason === 'string' ? parserBridge.reason : 'unknown',
      adapterPath: typeof parserBridge.adapterPath === 'string' ? parserBridge.adapterPath : '',
      adapterExport: typeof parserBridge.adapterExport === 'string' ? parserBridge.adapterExport : '',
      error: typeof parserBridge.error === 'string' ? parserBridge.error : ''
    };
  }

  function getIntegrationStatus() {
    const hostManifest = isObject(app.hostManifest) ? app.hostManifest : null;
    const hostThemeState = app.hostThemeController?.getState?.() ?? null;
    const apiContract = isObject(app.apiContract)
      ? app.apiContract
      : createRuntimeApiContract();

    return {
      parserBridge: getParserBridgeStatus(),
      apiContract,
      release: {
        date: app.releaseMeta?.releaseDate ?? '',
        id: app.releaseMeta?.releaseId ?? '',
        arc: app.releaseMeta?.releaseArc ?? '',
        vibe: app.releaseMeta?.releaseVibe ?? ''
      },
      runtime: {
        embedMode: app.runtimeConfig?.embedMode ?? 'standalone',
        baseUrl: app.runtimeConfig?.baseUrl ?? '/',
        serviceWorker: Boolean(app.runtimeConfig?.enableServiceWorker),
        hostId: app.runtimeConfig?.hostId ?? 'spwashi.click',
        hostVersion: app.runtimeConfig?.hostVersion ?? '',
        hostManifestPath: app.runtimeConfig?.hostManifestPath ?? '',
        hostManifestRequired: Boolean(app.runtimeConfig?.hostManifestRequired)
      },
      hostManifest: hostManifest
        ? {
            version: hostManifest.version,
            reason: hostManifest.reason,
            source: hostManifest.source,
            compatible: hostManifest.api?.compatible === true
          }
        : null,
      hostCompatibility: app.hostCompatibility ?? {
        compatible: true,
        reasons: [],
        missingInterfaces: []
      },
      hostTheme: hostThemeState
        ? {
            activeRuleIds: hostThemeState.activeRuleIds,
            tokenCount: hostThemeState.tokenCount,
            reason: hostThemeState.reason
          }
        : null,
      enhancements: {
        profile: app.enhancementRuntime?.manifest?.profile ?? 'baseline',
        loadedCount: app.enhancementRuntime?.loadedEnhancements?.length ?? 0,
        gatedCount: app.enhancementRuntime?.gatedEnhancements?.length ?? 0
      }
    };
  }

  function getSnapshot() {
    return {
      route: app.store.getState().activeRoute,
      state: app.store.getState(),
      ecology: app.ecology.getSnapshot(),
      release: app.releaseMeta,
      performanceProfile: app.performanceController.getProfile(),
      llmReadableStructure: app.structureController.enabled,
      textureTunerState: root.dataset.textureTunerState ?? 'unknown',
      pwaState: root.dataset.pwaState ?? 'unknown',
      networkState: root.dataset.networkState ?? 'unknown',
      embedMode: app.runtimeConfig?.embedMode ?? 'standalone',
      baseUrl: app.runtimeConfig?.baseUrl ?? '/',
      hostId: app.runtimeConfig?.hostId ?? 'spwashi.click',
      hostVersion: app.runtimeConfig?.hostVersion ?? '',
      catalogVersion: SPW_FEATURE_CATALOG.version,
      parserBridge: getParserBridgeStatus(),
      hostManifestReason: app.hostManifest?.reason ?? 'none',
      hostCompatibility: app.hostCompatibility?.compatible === true ? 'compatible' : 'incompatible',
      hostThemeRuleCount: app.hostThemeController?.getState?.()?.activeRuleIds?.length ?? 0
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

  function registerEcologySpecies(payload = {}) {
    const list = Array.isArray(payload) ? payload : [payload];
    let registered = 0;

    for (const species of list) {
      if (!isObject(species) || typeof species.tagName !== 'string' || species.tagName.length === 0) {
        continue;
      }

      app.ecology.registerSpecies({
        tagName: species.tagName,
        role: typeof species.role === 'string' ? species.role : 'host-extension',
        dependsOn: Array.isArray(species.dependsOn) ? species.dependsOn : [],
        emits: Array.isArray(species.emits) ? species.emits : []
      });
      registered += 1;
    }

    return {
      registered,
      snapshot: app.ecology.getSnapshot()
    };
  }

  function noteEcologyLifecycle(payload = {}) {
    if (!isObject(payload)) {
      return { ok: false, reason: 'invalid-payload', snapshot: app.ecology.getSnapshot() };
    }

    const tagName = String(payload.tagName ?? payload.tag ?? '').trim();
    const lifecycle = String(payload.lifecycle ?? payload.event ?? '').trim();
    if (!tagName || !lifecycle) {
      return { ok: false, reason: 'missing-tag-or-lifecycle', snapshot: app.ecology.getSnapshot() };
    }

    app.ecology.noteLifecycle(tagName, lifecycle, isObject(payload.detail) ? payload.detail : {});
    return { ok: true, snapshot: app.ecology.getSnapshot() };
  }

  function getEcologySnapshot() {
    return app.ecology.getSnapshot();
  }

  function getHostThemeState() {
    return app.hostThemeController?.getState?.() ?? {
      activeRuleIds: [],
      tokenCount: 0,
      reason: 'host-theme-unavailable'
    };
  }

  function getHostManifest() {
    return app.hostManifest ?? null;
  }

  function getApiContract() {
    const apiContract = isObject(app.apiContract)
      ? app.apiContract
      : createRuntimeApiContract();
    return {
      runtimeApiVersion: apiContract.runtimeApiVersion,
      interfaces: apiContract.interfaces
    };
  }

  function listInterfaces() {
    const apiContract = getApiContract();
    const interfaces = Object.keys(apiContract.interfaces).map((name) => ({
      name,
      version: apiContract.interfaces[name]
    }));

    return {
      runtimeApiVersion: apiContract.runtimeApiVersion,
      interfaces
    };
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
    dispatchTypedEvent(window, EVENT_RUNTIME_REBIND, {
      route: app.store.getState().activeRoute
    });

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

  function composeInterface(payload = {}) {
    const interfaces = resolveInterfaceList(payload);
    if (interfaces.length === 0) {
      return {
        ok: false,
        reason: 'no-interfaces-specified',
        available: listInterfaces()
      };
    }

    const composed = {};
    const missing = [];

    const interfaceMethods = {
      core: Object.freeze(['getSnapshot', 'setTopLevel', 'setRegion', 'setComponent', 'setWindowVars', 'resetRuntime', 'rebindRuntime']),
      catalog: Object.freeze(['getCatalog']),
      integration: Object.freeze(['getIntegrationStatus', 'getApiContract', 'listInterfaces', 'composeInterface']),
      ecology: Object.freeze(['getEcologySnapshot', 'registerEcologySpecies', 'noteEcologyLifecycle']),
      theming: Object.freeze(['getHostThemeState']),
      host: Object.freeze(['getIntegrationStatus', 'getHostThemeState', 'getHostManifest'])
    };

    for (const interfaceName of interfaces) {
      const methods = interfaceMethods[interfaceName];
      if (!methods) {
        missing.push(interfaceName);
        continue;
      }

      for (const methodName of methods) {
        composed[methodName] = runtimeApi[methodName];
      }
    }

    return {
      ok: missing.length === 0,
      interfaces,
      missing,
      api: Object.freeze(composed)
    };
  }

  const runtimeApi = {
    version: app.apiContract?.runtimeApiVersion ?? '1.1.0',
    getSnapshot,
    getCatalog,
    getIntegrationStatus,
    getApiContract,
    listInterfaces,
    composeInterface,
    getEcologySnapshot,
    registerEcologySpecies,
    noteEcologyLifecycle,
    getHostThemeState,
    getHostManifest,
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

      if (method === 'integration' || method === 'status' || method === 'getIntegrationStatus') {
        return getIntegrationStatus();
      }

      if (method === 'contract' || method === 'getApiContract') {
        return getApiContract();
      }

      if (method === 'interfaces' || method === 'listInterfaces') {
        return listInterfaces();
      }

      if (method === 'compose' || method === 'composeInterface') {
        return composeInterface(payload);
      }

      if (method === 'ecology' || method === 'getEcologySnapshot') {
        return getEcologySnapshot();
      }

      if (method === 'registerSpecies' || method === 'registerEcologySpecies') {
        return registerEcologySpecies(payload);
      }

      if (method === 'lifecycle' || method === 'noteEcologyLifecycle') {
        return noteEcologyLifecycle(payload);
      }

      if (method === 'theme' || method === 'getHostThemeState') {
        return getHostThemeState();
      }

      if (method === 'hostManifest' || method === 'getHostManifest') {
        return getHostManifest();
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
