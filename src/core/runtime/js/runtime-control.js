import { SPW_FEATURE_CATALOG, summarizeFeatureCatalog } from '../../../content/feature-catalog.js';
import {
  EVENT_REGISTER_CHANGED,
  EVENT_RUNTIME_REBIND,
  EVENT_VIEWPORT_CHANGED,
  dispatchTypedEvent
} from './events.js';
import { createRuntimeApiContract } from './runtime-contract.js';
import { runSpwRuntimeCommand } from './spw-command-surface.js';

const DEFAULT_FOCUS_REGISTER_KEY = '"';
const DEFAULT_VIEWPORT_MODE = 'adaptive';
const FALLBACK_MOBILE_BREAKPOINT = 900;
const FALLBACK_COMPACT_BREAKPOINT = 640;
const MAX_REGISTER_LIMINALITY = 3;
const DEFAULT_REGISTER_MEASURE_SCALE = 10;

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

function cloneRuntimeValue(value) {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // fall through to JSON clone fallback
    }
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function normalizeRegisterKey(value, fallbackValue = DEFAULT_FOCUS_REGISTER_KEY) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : fallbackValue;
}

function normalizeMarkName(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
  return normalized;
}

function summarizeRegisterValue(value) {
  if (isObject(value) && isObject(value.state)) {
    return {
      route: value.state.activeRoute ?? '',
      phase: value.state.phase ?? '',
      clickCount: value.state.clickCount ?? 0
    };
  }

  if (isObject(value) && isObject(value.topLevel)) {
    return {
      route: value.topLevel.route ?? '',
      clickCount: value.topLevel.clickCount ?? 0,
      profile: value.topLevel.performanceProfile ?? ''
    };
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return `[array:${value.length}]`;
  }

  return '[object]';
}

function clampLiminality(value) {
  const parsed = Number.parseInt(String(value ?? 0), 10);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.min(MAX_REGISTER_LIMINALITY, parsed));
}

function normalizeMeasureDepth(value) {
  const parsed = Number.parseInt(String(value ?? 0), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

function normalizeRegisterCouplings(value, selfKey = '') {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((entry) => String(entry ?? '').trim())
        .filter((entry) => entry.length > 0 && entry !== selfKey)
    )
  ).sort();
}

function parseEpochMs(value) {
  const parsed = Date.parse(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function computeRegisterFrequency(entry, nowMs = Date.now()) {
  const writeCount = Number.parseInt(String(entry.writeCount ?? 0), 10);
  if (!Number.isFinite(writeCount) || writeCount <= 0) {
    return 0;
  }

  const firstWriteAtMs = parseEpochMs(entry.firstWriteAt ?? entry.updatedAt);
  if (firstWriteAtMs === null) {
    return writeCount;
  }

  const elapsedSeconds = Math.max((nowMs - firstWriteAtMs) / 1000, 1);
  return Number((writeCount / elapsedSeconds).toFixed(3));
}

function summarizeRegisterAcoustics(entry, registerCount, nowMs = Date.now()) {
  const coupledCount = Array.isArray(entry.coupledKeys) ? entry.coupledKeys.length : 0;
  const denominator = Math.max(registerCount - 1, 1);

  return {
    liminality: clampLiminality(entry.liminality),
    frequency: computeRegisterFrequency(entry, nowMs),
    coupling: Number((coupledCount / denominator).toFixed(3)),
    measureDepth: normalizeMeasureDepth(entry.measureDepth)
  };
}

export function installRuntimeControl({ app, document, window, rebindPage }) {
  if (!app || !document || !window) {
    return () => {};
  }

  const root = document.documentElement;
  const registerEntries = new Map();
  const registerMarks = new Map();
  let registerFocusKey = normalizeRegisterKey(
    app.runtimeConfig?.registerFocusKey,
    DEFAULT_FOCUS_REGISTER_KEY
  );

  function resolveViewportFromPayload(payload = {}) {
    const modeToken =
      typeof payload === 'string'
        ? payload
        : String(payload.mode ?? root.dataset.spwViewportMode ?? app.viewport?.mode ?? DEFAULT_VIEWPORT_MODE);
    const normalizedMode = modeToken === 'fixed' ? 'fixed' : DEFAULT_VIEWPORT_MODE;
    const mobileBreakpoint = Number.isFinite(Number(app.runtimeConfig?.mobileBreakpoint))
      ? Number(app.runtimeConfig.mobileBreakpoint)
      : FALLBACK_MOBILE_BREAKPOINT;
    const compactBreakpoint = Number.isFinite(Number(app.runtimeConfig?.compactBreakpoint))
      ? Number(app.runtimeConfig.compactBreakpoint)
      : FALLBACK_COMPACT_BREAKPOINT;

    const viewportWidth = Number.isFinite(Number(payload.width))
      ? Number(payload.width)
      : Number(window.innerWidth ?? 0);
    const viewportHeight = Number.isFinite(Number(payload.height))
      ? Number(payload.height)
      : Number(window.innerHeight ?? 0);

    const explicitBand = String(payload.band ?? '').trim();
    const derivedBand =
      viewportWidth <= compactBreakpoint
        ? 'nano'
        : viewportWidth <= mobileBreakpoint
          ? 'compact'
          : 'immersive';
    const band = explicitBand || derivedBand;

    const mobile =
      typeof payload.mobile === 'boolean'
        ? payload.mobile
        : band === 'nano' || band === 'compact';

    return {
      mode: normalizedMode,
      band,
      mobile,
      width: Math.round(viewportWidth),
      height: Math.round(viewportHeight),
      mobileBreakpoint,
      compactBreakpoint
    };
  }

  function setViewportMode(payload = {}) {
    const viewport = resolveViewportFromPayload(payload);
    root.dataset.spwViewportMode = viewport.mode;
    root.dataset.spwViewportBand = viewport.band;
    root.dataset.spwMobile = viewport.mobile ? 'true' : 'false';
    root.dataset.spwMobileBreakpoint = String(viewport.mobileBreakpoint);
    root.dataset.spwCompactBreakpoint = String(viewport.compactBreakpoint);
    if (viewport.height > 0) {
      root.style.setProperty('--spw-vh', `${(viewport.height * 0.01).toFixed(4)}px`);
    }

    app.viewport = Object.freeze(viewport);
    dispatchTypedEvent(window, EVENT_VIEWPORT_CHANGED, {
      ...viewport,
      reason: String(payload.reason ?? 'runtime-control')
    });

    return {
      viewport,
      snapshot: getSnapshot()
    };
  }

  function ensureRegisterEntry(key) {
    const normalizedKey = normalizeRegisterKey(key, registerFocusKey);
    const nowIso = new Date().toISOString();
    const existing = registerEntries.get(normalizedKey);
    if (!existing) {
      registerEntries.set(normalizedKey, {
        value: null,
        source: 'init',
        updatedAt: nowIso,
        firstWriteAt: nowIso,
        writeCount: 0,
        liminality: 0,
        measureDepth: 0,
        coupledKeys: []
      });
      return normalizedKey;
    }

    registerEntries.set(normalizedKey, {
      value: existing.value ?? null,
      source: typeof existing.source === 'string' ? existing.source : 'init',
      updatedAt: typeof existing.updatedAt === 'string' ? existing.updatedAt : nowIso,
      firstWriteAt:
        typeof existing.firstWriteAt === 'string'
          ? existing.firstWriteAt
          : typeof existing.updatedAt === 'string'
            ? existing.updatedAt
            : nowIso,
      writeCount: normalizeMeasureDepth(existing.writeCount),
      liminality: clampLiminality(existing.liminality),
      measureDepth: normalizeMeasureDepth(existing.measureDepth),
      coupledKeys: normalizeRegisterCouplings(existing.coupledKeys, normalizedKey)
    });

    return normalizedKey;
  }

  function getRegisterEntry(key) {
    const normalizedKey = ensureRegisterEntry(key);
    return {
      key: normalizedKey,
      ...registerEntries.get(normalizedKey)
    };
  }

  function updateRegisterEntry(key, updater) {
    const current = getRegisterEntry(key);
    const nextEntry = updater(current) ?? current;
    registerEntries.set(current.key, {
      value: nextEntry.value ?? null,
      source: typeof nextEntry.source === 'string' ? nextEntry.source : current.source,
      updatedAt:
        typeof nextEntry.updatedAt === 'string' ? nextEntry.updatedAt : new Date().toISOString(),
      firstWriteAt:
        typeof nextEntry.firstWriteAt === 'string' ? nextEntry.firstWriteAt : current.firstWriteAt,
      writeCount: normalizeMeasureDepth(nextEntry.writeCount),
      liminality: clampLiminality(nextEntry.liminality),
      measureDepth: normalizeMeasureDepth(nextEntry.measureDepth),
      coupledKeys: normalizeRegisterCouplings(nextEntry.coupledKeys, current.key)
    });

    return registerEntries.get(current.key);
  }

  function registerAcousticsFromKey(key, nowMs = Date.now()) {
    const entry = getRegisterEntry(key);
    return summarizeRegisterAcoustics(entry, registerEntries.size, nowMs);
  }

  function listRegisters({ includeValues = false } = {}) {
    const nowMs = Date.now();
    const entries = Array.from(registerEntries.keys()).map((key) => {
      const entry = getRegisterEntry(key);
      const acoustics = summarizeRegisterAcoustics(entry, registerEntries.size, nowMs);

      return {
        key,
        source: entry.source,
        updatedAt: entry.updatedAt,
        firstWriteAt: entry.firstWriteAt,
        writeCount: entry.writeCount,
        summary: summarizeRegisterValue(entry.value),
        liminality: acoustics.liminality,
        measureDepth: acoustics.measureDepth,
        frequency: acoustics.frequency,
        coupling: acoustics.coupling,
        coupledKeys: [...entry.coupledKeys],
        ...(includeValues ? { value: cloneRuntimeValue(entry.value) } : {})
      };
    });

    return {
      focusKey: registerFocusKey,
      registerCount: entries.length,
      entries,
      marks: Object.fromEntries(registerMarks.entries())
    };
  }

  function emitRegisterEvent(action, payload = {}) {
    dispatchTypedEvent(window, EVENT_REGISTER_CHANGED, {
      action,
      focusKey: registerFocusKey,
      ...payload
    });
  }

  function focusRegister(payload = {}) {
    const key = normalizeRegisterKey(
      typeof payload === 'string' ? payload : payload.key,
      registerFocusKey
    );
    registerFocusKey = ensureRegisterEntry(key);
    emitRegisterEvent('focus', { key: registerFocusKey });
    return listRegisters();
  }

  function setRegister(payload = {}) {
    const sourcePayload = isObject(payload) ? payload : {};
    const key = ensureRegisterEntry(
      normalizeRegisterKey(
        typeof payload === 'string' ? payload : sourcePayload.key,
        registerFocusKey
      )
    );
    const source = String(sourcePayload.source ?? 'set');
    const value = sourcePayload.value === undefined ? getSnapshot() : sourcePayload.value;
    const nowIso = new Date().toISOString();
    const entry = updateRegisterEntry(key, (current) => ({
      ...current,
      value: cloneRuntimeValue(value),
      source,
      updatedAt: nowIso,
      writeCount: current.writeCount + 1
    }));
    registerFocusKey = key;

    emitRegisterEvent('set', {
      key,
      source,
      summary: summarizeRegisterValue(value),
      liminality: entry.liminality,
      measureDepth: entry.measureDepth
    });

    return {
      key,
      value: cloneRuntimeValue(value),
      registers: listRegisters()
    };
  }

  function extractRegister(payload = {}) {
    const sourcePayload = isObject(payload) ? payload : {};
    return setRegister({
      ...sourcePayload,
      value: getSnapshot(),
      source: sourcePayload.source ?? 'extract'
    });
  }

  function getRegister(payload = {}) {
    const key = normalizeRegisterKey(
      typeof payload === 'string' ? payload : payload.key,
      registerFocusKey
    );
    if (!registerEntries.has(key)) {
      return { ok: false, reason: 'register-missing', key, registers: listRegisters() };
    }
    const entry = getRegisterEntry(key);
    if (!entry) {
      return { ok: false, reason: 'register-missing', key, registers: listRegisters() };
    }
    const acoustics = registerAcousticsFromKey(key);

    return {
      ok: true,
      key,
      value: cloneRuntimeValue(entry.value),
      source: entry.source,
      updatedAt: entry.updatedAt,
      firstWriteAt: entry.firstWriteAt,
      writeCount: entry.writeCount,
      liminality: entry.liminality,
      measureDepth: entry.measureDepth,
      coupledKeys: [...entry.coupledKeys],
      acoustics
    };
  }

  function depositRegister(payload = {}) {
    const key = normalizeRegisterKey(
      typeof payload === 'string' ? payload : payload.key,
      registerFocusKey
    );
    const entry = registerEntries.get(key);
    if (!entry) {
      return { ok: false, reason: 'register-missing', key, snapshot: getSnapshot() };
    }

    const value = cloneRuntimeValue(entry.value);
    let applied = false;

    if (isObject(value)) {
      const topLevel = isObject(value.topLevel)
        ? value.topLevel
        : isObject(value.state)
          ? {
              route: value.state.activeRoute,
              clickCount: value.state.clickCount,
              reducedMotion: value.state.reducedMotion,
              performanceProfile: value.performanceProfile,
              llmReadableStructure: value.llmReadableStructure
            }
          : value;

      const hasTopLevel =
        topLevel.route !== undefined ||
        topLevel.clickCount !== undefined ||
        topLevel.reducedMotion !== undefined ||
        topLevel.performanceProfile !== undefined ||
        topLevel.llmReadableStructure !== undefined;

      if (hasTopLevel) {
        setTopLevel(topLevel);
        applied = true;
      }

      if (isObject(value.windowVars) && Object.keys(value.windowVars).length > 0) {
        setWindowVars(value.windowVars);
        applied = true;
      }
    }

    registerFocusKey = key;
    emitRegisterEvent('deposit', {
      key,
      applied
    });

    return {
      ok: true,
      key,
      applied,
      snapshot: getSnapshot()
    };
  }

  function markRegister(payload = {}) {
    const markName = normalizeMarkName(payload.name ?? payload.mark);
    if (!markName) {
      return { ok: false, reason: 'mark-name-required', registers: listRegisters() };
    }

    const key = ensureRegisterEntry(
      normalizeRegisterKey(payload.key ?? payload.register, registerFocusKey)
    );
    registerMarks.set(markName, key);

    emitRegisterEvent('mark', {
      mark: markName,
      key
    });

    return {
      ok: true,
      mark: markName,
      key,
      registers: listRegisters()
    };
  }

  function getMark(payload = {}) {
    const markName = normalizeMarkName(payload.name ?? payload.mark);
    const key = registerMarks.get(markName);
    if (!markName || !key) {
      return { ok: false, reason: 'mark-missing', mark: markName };
    }

    return {
      ok: true,
      mark: markName,
      key,
      register: getRegister({ key })
    };
  }

  function promoteRegister(payload = {}) {
    const key = ensureRegisterEntry(
      normalizeRegisterKey(
        typeof payload === 'string' ? payload : payload.key ?? payload.register,
        registerFocusKey
      )
    );
    const nowIso = new Date().toISOString();
    const nextEntry = updateRegisterEntry(key, (current) => ({
      ...current,
      source: 'promote',
      updatedAt: nowIso,
      writeCount: current.writeCount + 1,
      liminality: clampLiminality(current.liminality + 1)
    }));
    registerFocusKey = key;

    emitRegisterEvent('promote', {
      key,
      liminality: nextEntry.liminality
    });

    return {
      ok: true,
      key,
      liminality: nextEntry.liminality,
      register: getRegister({ key }),
      registers: listRegisters()
    };
  }

  function demoteRegister(payload = {}) {
    const key = ensureRegisterEntry(
      normalizeRegisterKey(
        typeof payload === 'string' ? payload : payload.key ?? payload.register,
        registerFocusKey
      )
    );
    const nowIso = new Date().toISOString();
    const nextEntry = updateRegisterEntry(key, (current) => ({
      ...current,
      source: 'demote',
      updatedAt: nowIso,
      writeCount: current.writeCount + 1,
      liminality: clampLiminality(current.liminality - 1)
    }));
    registerFocusKey = key;

    emitRegisterEvent('demote', {
      key,
      liminality: nextEntry.liminality
    });

    return {
      ok: true,
      key,
      liminality: nextEntry.liminality,
      register: getRegister({ key }),
      registers: listRegisters()
    };
  }

  function coupleRegisters(payload = {}) {
    const sourcePayload = isObject(payload) ? payload : {};
    const keyA = ensureRegisterEntry(
      normalizeRegisterKey(sourcePayload.key ?? sourcePayload.a ?? sourcePayload.left, registerFocusKey)
    );
    const candidateB = sourcePayload.with ?? sourcePayload.to ?? sourcePayload.b ?? sourcePayload.right;
    const keyB = normalizeRegisterKey(candidateB, '');
    if (!keyB) {
      return { ok: false, reason: 'couple-target-required', key: keyA, registers: listRegisters() };
    }
    if (keyA === keyB) {
      return { ok: false, reason: 'couple-target-must-differ', key: keyA, registers: listRegisters() };
    }

    const normalizedKeyB = ensureRegisterEntry(keyB);
    const nowIso = new Date().toISOString();

    updateRegisterEntry(keyA, (current) => ({
      ...current,
      source: 'couple',
      updatedAt: nowIso,
      writeCount: current.writeCount + 1,
      coupledKeys: normalizeRegisterCouplings([...current.coupledKeys, normalizedKeyB], keyA)
    }));
    updateRegisterEntry(normalizedKeyB, (current) => ({
      ...current,
      source: 'couple',
      updatedAt: nowIso,
      writeCount: current.writeCount + 1,
      coupledKeys: normalizeRegisterCouplings([...current.coupledKeys, keyA], normalizedKeyB)
    }));
    registerFocusKey = keyA;

    emitRegisterEvent('couple', {
      key: keyA,
      with: normalizedKeyB
    });

    return {
      ok: true,
      key: keyA,
      with: normalizedKeyB,
      registers: listRegisters()
    };
  }

  function measureRegister(payload = {}) {
    const sourcePayload = isObject(payload) ? payload : {};
    const key = ensureRegisterEntry(
      normalizeRegisterKey(
        typeof payload === 'string' ? payload : sourcePayload.key ?? sourcePayload.register,
        registerFocusKey
      )
    );

    const scaleInput = Number(sourcePayload.scale ?? sourcePayload.max ?? DEFAULT_REGISTER_MEASURE_SCALE);
    const scale = Number.isFinite(scaleInput) && scaleInput > 0 ? scaleInput : DEFAULT_REGISTER_MEASURE_SCALE;
    const nowIso = new Date().toISOString();
    const nextEntry = updateRegisterEntry(key, (current) => ({
      ...current,
      source: 'measure',
      updatedAt: nowIso,
      writeCount: current.writeCount + 1,
      measureDepth: normalizeMeasureDepth(current.measureDepth + 1)
    }));
    const acoustics = registerAcousticsFromKey(key);
    const value = Number((Math.min(nextEntry.measureDepth / scale, 1)).toFixed(3));
    registerFocusKey = key;

    emitRegisterEvent('measure', {
      key,
      value,
      scale,
      measureDepth: nextEntry.measureDepth
    });

    return {
      ok: true,
      key,
      value,
      scale,
      measureDepth: nextEntry.measureDepth,
      liminality: nextEntry.liminality,
      frequency: acoustics.frequency,
      coupling: acoustics.coupling,
      register: getRegister({ key })
    };
  }

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
        hostManifestRequired: Boolean(app.runtimeConfig?.hostManifestRequired),
        viewportMode: root.dataset.spwViewportMode ?? app.runtimeConfig?.viewportMode ?? DEFAULT_VIEWPORT_MODE,
        viewportBand: root.dataset.spwViewportBand ?? app.viewport?.band ?? 'immersive',
        mobile: (root.dataset.spwMobile ?? 'false') === 'true'
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
      },
      registers: listRegisters()
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
      hostThemeRuleCount: app.hostThemeController?.getState?.()?.activeRuleIds?.length ?? 0,
      viewportMode: root.dataset.spwViewportMode ?? app.runtimeConfig?.viewportMode ?? DEFAULT_VIEWPORT_MODE,
      viewportBand: root.dataset.spwViewportBand ?? app.viewport?.band ?? 'immersive',
      mobile: (root.dataset.spwMobile ?? 'false') === 'true',
      registerFocusKey,
      registerCount: registerEntries.size
    };
  }

  const bootstrapTimestamp = new Date().toISOString();
  registerEntries.set(registerFocusKey, {
    value: cloneRuntimeValue(getSnapshot()),
    source: 'bootstrap',
    updatedAt: bootstrapTimestamp,
    firstWriteAt: bootstrapTimestamp,
    writeCount: 1,
    liminality: 0,
    measureDepth: 0,
    coupledKeys: []
  });

  if (!root.dataset.spwViewportMode || !root.dataset.spwViewportBand) {
    setViewportMode({ reason: 'runtime-control:init' });
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
      registers: Object.freeze([
        'listRegisters',
        'focusRegister',
        'setRegister',
        'getRegister',
        'extractRegister',
        'depositRegister',
        'markRegister',
        'getMark',
        'promoteRegister',
        'demoteRegister',
        'coupleRegisters',
        'measureRegister'
      ]),
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
    version: app.apiContract?.runtimeApiVersion ?? '1.3.0',
    getSnapshot,
    getCatalog,
    getIntegrationStatus,
    getApiContract,
    listInterfaces,
    composeInterface,
    getEcologySnapshot,
    registerEcologySpecies,
    noteEcologyLifecycle,
    listRegisters,
    focusRegister,
    setRegister,
    getRegister,
    extractRegister,
    depositRegister,
    markRegister,
    getMark,
    promoteRegister,
    demoteRegister,
    coupleRegisters,
    measureRegister,
    setViewportMode,
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

      if (method === 'registers' || method === 'listRegisters') {
        return listRegisters(payload);
      }

      if (method === 'focus' || method === 'focusRegister') {
        return focusRegister(payload);
      }

      if (method === 'register' || method === 'setRegister') {
        return setRegister(payload);
      }

      if (method === 'getRegister') {
        return getRegister(payload);
      }

      if (method === 'extract' || method === 'extractRegister') {
        return extractRegister(payload);
      }

      if (method === 'deposit' || method === 'depositRegister') {
        return depositRegister(payload);
      }

      if (method === 'mark' || method === 'markRegister') {
        return markRegister(payload);
      }

      if (method === 'getMark') {
        return getMark(payload);
      }

      if (method === 'promote' || method === 'promoteRegister') {
        return promoteRegister(payload);
      }

      if (method === 'demote' || method === 'demoteRegister') {
        return demoteRegister(payload);
      }

      if (method === 'couple' || method === 'coupleRegisters') {
        return coupleRegisters(payload);
      }

      if (method === 'measure' || method === 'measureRegister') {
        return measureRegister(payload);
      }

      if (method === 'viewport' || method === 'setViewportMode') {
        return setViewportMode(payload);
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
