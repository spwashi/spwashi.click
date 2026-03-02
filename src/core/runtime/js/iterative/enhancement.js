import {
  EVENT_ENHANCEMENT_GATED,
  EVENT_ENHANCEMENT_FAILED,
  EVENT_ENHANCEMENT_LOADED,
  dispatchTypedEvent
} from '../events.js';
import { readReleaseMeta } from '../release.js';
import { readRuntimeConfig, resolveRuntimeAssetUrl } from '../runtime/config.js';
import {
  RUNTIME_API_VERSION,
  RUNTIME_INTERFACE_VERSIONS,
  evaluateCompatibilityWindow,
  isVersionInRange
} from '../runtime/contract.js';

const DEFAULT_MANIFEST_PATH = '/seed/site/enhancements.manifest.json';

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createFallbackManifest(reason = 'missing-manifest', source = '') {
  return Object.freeze({
    version: '1',
    profile: 'baseline',
    reason,
    source,
    enhancements: Object.freeze([])
  });
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeStringArray(value) {
  return normalizeArray(value).map((entry) => String(entry ?? '').trim()).filter(Boolean);
}

function normalizeInterfaceWindows(value) {
  if (!isObject(value)) {
    return Object.freeze({});
  }

  return Object.freeze(
    Object.fromEntries(
      Object.entries(value)
        .map(([interfaceName, minVersion]) => [String(interfaceName).trim().toLowerCase(), String(minVersion).trim()])
        .filter(([interfaceName, minVersion]) => interfaceName.length > 0 && minVersion.length > 0)
    )
  );
}

function normalizeEnhancementEntry(entry, index) {
  if (!isObject(entry)) {
    return null;
  }

  const id = String(entry.id ?? `enhancement-${index + 1}`).trim();
  const module = String(entry.module ?? '').trim();
  if (!id || !module) {
    return null;
  }

  return Object.freeze({
    ...entry,
    id,
    module,
    routes: Object.freeze(normalizeStringArray(entry.routes)),
    hosts: Object.freeze(normalizeStringArray(entry.hosts).map((host) => host.toLowerCase())),
    requiredInterfaces: Object.freeze(
      normalizeStringArray(entry.requiredInterfaces).map((interfaceName) => interfaceName.toLowerCase())
    ),
    interfaceVersions: normalizeInterfaceWindows(entry.interfaceVersions),
    minRuntimeApi: String(entry.minRuntimeApi ?? '').trim(),
    maxRuntimeApi: String(entry.maxRuntimeApi ?? '').trim(),
    enabled: entry.enabled !== false
  });
}

function normalizeEnhancementList(list) {
  const normalized = [];
  for (const [index, entry] of normalizeArray(list).entries()) {
    const normalizedEntry = normalizeEnhancementEntry(entry, index);
    if (normalizedEntry) {
      normalized.push(normalizedEntry);
    }
  }
  return normalized;
}

function enhancementAppliesToRoute(entry, route) {
  const routes = entry.routes?.length > 0 ? entry.routes : ['home', 'work', 'notes'];
  return routes.includes(route);
}

function enhancementAppliesToHost(entry, hostId) {
  if (!entry.hosts || entry.hosts.length === 0) {
    return true;
  }

  return entry.hosts.includes(String(hostId ?? '').trim().toLowerCase());
}

function evaluateEnhancementCompatibility({
  entry,
  runtimeApiVersion = RUNTIME_API_VERSION,
  interfaceVersions = RUNTIME_INTERFACE_VERSIONS
}) {
  const reasons = [];
  const apiWindow = evaluateCompatibilityWindow(
    {
      minRuntimeApi: entry.minRuntimeApi,
      maxRuntimeApi: entry.maxRuntimeApi
    },
    runtimeApiVersion
  );

  if (!apiWindow.compatible) {
    reasons.push('runtime-api-range');
  }

  for (const requiredInterface of entry.requiredInterfaces ?? []) {
    if (!interfaceVersions[requiredInterface]) {
      reasons.push(`missing-interface:${requiredInterface}`);
    }
  }

  for (const [interfaceName, minVersion] of Object.entries(entry.interfaceVersions ?? {})) {
    const resolvedVersion = interfaceVersions[interfaceName] ?? '';
    if (!resolvedVersion || !isVersionInRange(resolvedVersion, { min: minVersion })) {
      reasons.push(`interface-version:${interfaceName}`);
    }
  }

  return Object.freeze({
    compatible: reasons.length === 0,
    reasons: Object.freeze(reasons),
    minRuntimeApi: apiWindow.minRuntimeApi,
    maxRuntimeApi: apiWindow.maxRuntimeApi
  });
}

async function importEnhancementModule(modulePath) {
  const module = await import(modulePath);
  const installer = module.installEnhancement ?? module.install;

  if (typeof installer !== 'function') {
    throw new TypeError(`Enhancement module ${modulePath} must export installEnhancement(context)`);
  }

  return installer;
}

export async function loadEnhancementManifest({
  fetchImpl = globalThis.fetch,
  manifestPath = DEFAULT_MANIFEST_PATH,
  assetVersion = '',
  runtimeConfig = readRuntimeConfig()
} = {}) {
  const normalizedManifestPath = String(manifestPath ?? '').trim();
  if (!normalizedManifestPath) {
    return createFallbackManifest('manifest-path-missing', normalizedManifestPath);
  }

  if (typeof fetchImpl !== 'function') {
    return createFallbackManifest('fetch-unavailable', normalizedManifestPath);
  }

  try {
    const manifestUrl = resolveRuntimeAssetUrl(normalizedManifestPath, runtimeConfig, { assetVersion });
    const response = await fetchImpl(manifestUrl, { cache: 'no-store' });
    if (!response.ok) {
      return createFallbackManifest('manifest-not-found', manifestUrl);
    }

    const parsed = await response.json();

    return Object.freeze({
      version: parsed.version ?? '1',
      profile: parsed.profile ?? 'baseline',
      reason: 'ok',
      source: manifestUrl,
      enhancements: Object.freeze(normalizeEnhancementList(parsed.enhancements))
    });
  } catch {
    return createFallbackManifest('manifest-unreadable', normalizedManifestPath);
  }
}

function mergeEnhancementManifests(baseManifest, hostManifest, hostManifestMode = 'append') {
  const baseEnhancements = normalizeEnhancementList(baseManifest?.enhancements);
  const hostEnhancements = normalizeEnhancementList(hostManifest?.enhancements);
  const profile = String(hostManifest?.profile ?? baseManifest?.profile ?? 'baseline');

  const enhancements =
    hostManifestMode === 'prepend'
      ? [...hostEnhancements, ...baseEnhancements]
      : [...baseEnhancements, ...hostEnhancements];

  return Object.freeze({
    version: String(hostManifest?.version ?? baseManifest?.version ?? '1'),
    profile,
    reason: 'merged',
    source: [
      String(baseManifest?.source ?? '').trim(),
      String(hostManifest?.source ?? '').trim()
    ].filter(Boolean).join('|'),
    enhancements: Object.freeze(enhancements)
  });
}

function hasUsableManifest(manifest) {
  return isObject(manifest) && Array.isArray(manifest.enhancements) && manifest.reason === 'ok';
}

function evaluateEntryGating({
  entry,
  route,
  hostId,
  runtimeApiVersion,
  interfaceVersions
}) {
  const reasons = [];
  if (!entry.enabled) {
    reasons.push('disabled');
  }
  if (!enhancementAppliesToRoute(entry, route)) {
    reasons.push('route-mismatch');
  }
  if (!enhancementAppliesToHost(entry, hostId)) {
    reasons.push('host-mismatch');
  }

  const compatibility = evaluateEnhancementCompatibility({
    entry,
    runtimeApiVersion,
    interfaceVersions
  });
  if (!compatibility.compatible) {
    reasons.push(...compatibility.reasons);
  }

  return Object.freeze({
    allowed: reasons.length === 0,
    reasons: Object.freeze(reasons),
    compatibility
  });
}

export async function runIterativeEnhancements({
  app,
  route,
  document,
  fetchImpl = globalThis.fetch,
  manifestPath = DEFAULT_MANIFEST_PATH,
  runtimeConfig = readRuntimeConfig({ documentRef: document }),
  hostManifest = null,
  runtimeApiVersion = RUNTIME_API_VERSION,
  interfaceVersions = RUNTIME_INTERFACE_VERSIONS
}) {
  const releaseMeta = readReleaseMeta(document);
  const baseManifest = await loadEnhancementManifest({
    fetchImpl,
    manifestPath,
    assetVersion: releaseMeta.assetVersion,
    runtimeConfig
  });

  const hostEnhancementManifestPath = String(
    runtimeConfig.hostEnhancementManifestPath ?? hostManifest?.enhancements?.manifestPath ?? ''
  ).trim();
  const hostEnhancementManifest = hostEnhancementManifestPath
    ? await loadEnhancementManifest({
        fetchImpl,
        manifestPath: hostEnhancementManifestPath,
        assetVersion: releaseMeta.assetVersion,
        runtimeConfig
      })
    : createFallbackManifest('host-enhancement-manifest-disabled');

  const manifest = hasUsableManifest(hostEnhancementManifest)
    ? mergeEnhancementManifests(
        baseManifest,
        hostEnhancementManifest,
        hostManifest?.enhancements?.prepend === true ? 'prepend' : 'append'
      )
    : baseManifest;

  const cleanups = [];
  const gatedEnhancements = [];
  const loadedEnhancements = [];
  const hostId = String(runtimeConfig.hostId ?? '').toLowerCase();

  document.documentElement.dataset.enhancementProfile = manifest.profile;
  document.documentElement.dataset.enhancementCount = '0';
  document.documentElement.dataset.enhancementGatedCount = '0';
  document.documentElement.dataset.assetVersion = releaseMeta.assetVersion;

  for (const entry of manifest.enhancements) {
    const gating = evaluateEntryGating({
      entry,
      route,
      hostId,
      runtimeApiVersion,
      interfaceVersions
    });

    if (!gating.allowed) {
      gatedEnhancements.push({
        id: entry.id,
        module: entry.module,
        reasons: gating.reasons
      });
      dispatchTypedEvent(window, EVENT_ENHANCEMENT_GATED, {
        id: entry.id,
        route,
        hostId,
        reasons: gating.reasons
      });
      continue;
    }

    const enhancementId = entry.id ?? 'unknown-enhancement';
    const modulePath = resolveRuntimeAssetUrl(entry.module, runtimeConfig, {
      assetVersion: releaseMeta.assetVersion
    });

    try {
      const installer = await importEnhancementModule(modulePath);
      const runtimeEntry = {
        ...entry,
        module: modulePath,
        assetVersion: releaseMeta.assetVersion,
        compatibility: gating.compatibility
      };
      const cleanup = await installer({ app, route, document, entry: runtimeEntry, manifest });
      if (typeof cleanup === 'function') {
        cleanups.push(cleanup);
      }
      loadedEnhancements.push(enhancementId);

      dispatchTypedEvent(window, EVENT_ENHANCEMENT_LOADED, {
        id: enhancementId,
        route,
        profile: manifest.profile,
        module: modulePath,
        hostId
      });
    } catch (error) {
      dispatchTypedEvent(window, EVENT_ENHANCEMENT_FAILED, {
        id: enhancementId,
        route,
        profile: manifest.profile,
        module: modulePath,
        hostId,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  document.documentElement.dataset.enhancementCount = String(loadedEnhancements.length);
  document.documentElement.dataset.enhancementGatedCount = String(gatedEnhancements.length);

  return {
    manifest,
    loadedEnhancements: Object.freeze(loadedEnhancements),
    gatedEnhancements: Object.freeze(gatedEnhancements),
    cleanup() {
      for (const cleanup of cleanups) {
        cleanup();
      }
    }
  };
}
