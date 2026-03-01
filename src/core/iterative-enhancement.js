/**
 * ^intent:
 * ^intent[module]{ id:core.iterative-enhancement mode:spwlang surface:web }
 * ^invariants:
 * ^invariant[form]{ determinism:locked contracts:explicit sidefx:bounded }
 * ^invariant[state]{ mutation:public-api projection:data+aria }
 * ^compose:
 * ^compose[neighbors]{ ingress:imports egress:exports bridge:event+store }
 */

import {
  EVENT_ENHANCEMENT_FAILED,
  EVENT_ENHANCEMENT_LOADED,
  dispatchTypedEvent
} from './events.js';
import { readReleaseMeta } from './release.js';
import { readRuntimeConfig, resolveRuntimeAssetUrl } from './runtime-config.js';

const DEFAULT_MANIFEST_PATH = '/seed/site/enhancements.manifest.json';

function createFallbackManifest(reason = 'missing-manifest') {
  return Object.freeze({
    version: '1',
    profile: 'baseline',
    reason,
    enhancements: Object.freeze([])
  });
}

function normalizeEnhancementList(list) {
  if (!Array.isArray(list)) {
    return [];
  }

  return list.filter((entry) => entry && typeof entry === 'object');
}

function enhancementAppliesToRoute(entry, route) {
  const routes = Array.isArray(entry.routes) ? entry.routes : ['home', 'work', 'notes'];
  return routes.includes(route);
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
  if (typeof fetchImpl !== 'function') {
    return createFallbackManifest('fetch-unavailable');
  }

  try {
    const manifestUrl = resolveRuntimeAssetUrl(manifestPath, runtimeConfig, { assetVersion });
    const response = await fetchImpl(manifestUrl, { cache: 'no-store' });
    if (!response.ok) {
      return createFallbackManifest('manifest-not-found');
    }

    const parsed = await response.json();

    return Object.freeze({
      version: parsed.version ?? '1',
      profile: parsed.profile ?? 'baseline',
      enhancements: Object.freeze(normalizeEnhancementList(parsed.enhancements))
    });
  } catch {
    return createFallbackManifest('manifest-unreadable');
  }
}

export async function runIterativeEnhancements({
  app,
  route,
  document,
  fetchImpl = globalThis.fetch,
  manifestPath = DEFAULT_MANIFEST_PATH,
  runtimeConfig = readRuntimeConfig({ documentRef: document })
}) {
  const releaseMeta = readReleaseMeta(document);
  const manifest = await loadEnhancementManifest({
    fetchImpl,
    manifestPath,
    assetVersion: releaseMeta.assetVersion,
    runtimeConfig
  });
  const activeEnhancements = manifest.enhancements.filter(
    (entry) => entry.enabled !== false && enhancementAppliesToRoute(entry, route)
  );

  const cleanups = [];

  document.documentElement.dataset.enhancementProfile = manifest.profile;
  document.documentElement.dataset.enhancementCount = String(activeEnhancements.length);
  document.documentElement.dataset.assetVersion = releaseMeta.assetVersion;

  for (const entry of activeEnhancements) {
    const enhancementId = entry.id ?? 'unknown-enhancement';
    const modulePath = resolveRuntimeAssetUrl(entry.module, runtimeConfig, {
      assetVersion: releaseMeta.assetVersion
    });

    try {
      const installer = await importEnhancementModule(modulePath);
      const runtimeEntry = {
        ...entry,
        module: modulePath,
        assetVersion: releaseMeta.assetVersion
      };
      const cleanup = await installer({ app, route, document, entry: runtimeEntry, manifest });
      if (typeof cleanup === 'function') {
        cleanups.push(cleanup);
      }

      dispatchTypedEvent(window, EVENT_ENHANCEMENT_LOADED, {
        id: enhancementId,
        route,
        profile: manifest.profile,
        module: modulePath
      });
    } catch (error) {
      dispatchTypedEvent(window, EVENT_ENHANCEMENT_FAILED, {
        id: enhancementId,
        route,
        profile: manifest.profile,
        module: modulePath,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return {
    manifest,
    cleanup() {
      for (const cleanup of cleanups) {
        cleanup();
      }
    }
  };
}
