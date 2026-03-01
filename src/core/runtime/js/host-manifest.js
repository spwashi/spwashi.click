import { resolveRuntimeAssetUrl } from './runtime-config.js';
import {
  RUNTIME_API_VERSION,
  evaluateCompatibilityWindow,
  resolveCompatibilityWindow
} from './runtime-contract.js';

const DEFAULT_ROUTES = Object.freeze(['home', 'work', 'notes']);

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeHostToken(value, fallbackValue = '') {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');

  if (normalized.length === 0) {
    return fallbackValue;
  }

  return normalized;
}

function normalizeHostVersion(value) {
  return String(value ?? '').trim();
}

function normalizeEnhancementPath(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : '';
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeSpeciesList(list) {
  return normalizeArray(list)
    .filter((entry) => isObject(entry) && typeof entry.tagName === 'string')
    .map((entry) => ({
      tagName: String(entry.tagName).toLowerCase(),
      role: typeof entry.role === 'string' ? entry.role : 'host-extension',
      dependsOn: normalizeArray(entry.dependsOn).map((token) => String(token).toLowerCase()),
      emits: normalizeArray(entry.emits).map((token) => String(token))
    }));
}

function normalizeTokenMap(tokenMap) {
  if (!isObject(tokenMap)) {
    return Object.freeze({});
  }

  const normalizedEntries = [];
  for (const [key, value] of Object.entries(tokenMap)) {
    const tokenName = String(key ?? '').trim();
    if (!tokenName) {
      continue;
    }

    const cssVar = tokenName.startsWith('--') ? tokenName : `--${tokenName.replace(/^--/, '')}`;
    normalizedEntries.push([cssVar, String(value ?? '')]);
  }

  return Object.freeze(Object.fromEntries(normalizedEntries));
}

function normalizeThemeRule(rule, index) {
  if (!isObject(rule)) {
    return null;
  }

  const id = String(rule.id ?? `rule-${index + 1}`).trim();
  const media = isObject(rule.media) ? rule.media : {};
  const hostList = normalizeArray(rule.hosts).map((token) => normalizeHostToken(token));
  const routes = normalizeArray(rule.routes).map((token) => String(token).trim().toLowerCase());
  const phases = normalizeArray(rule.phases).map((token) => String(token).trim().toLowerCase());
  const embedModes = normalizeArray(rule.embedModes)
    .map((token) => String(token).trim().toLowerCase())
    .filter((value) => value.length > 0);

  return Object.freeze({
    id: id || `rule-${index + 1}`,
    hosts: Object.freeze(hostList.filter((value) => value.length > 0)),
    routes: Object.freeze(routes.filter((value) => value.length > 0)),
    phases: Object.freeze(phases.filter((value) => value.length > 0)),
    embedModes: Object.freeze(embedModes),
    media: Object.freeze({
      minWidth: Number.isFinite(Number(media.minWidth)) ? Number(media.minWidth) : null,
      maxWidth: Number.isFinite(Number(media.maxWidth)) ? Number(media.maxWidth) : null,
      prefersContrast: String(media.prefersContrast ?? '').trim().toLowerCase() || '',
      prefersReducedMotion:
        typeof media.prefersReducedMotion === 'boolean' ? media.prefersReducedMotion : null
    }),
    tokens: normalizeTokenMap(rule.tokens),
    dataset: Object.freeze(
      isObject(rule.dataset)
        ? Object.fromEntries(
            Object.entries(rule.dataset).map(([key, value]) => [
              String(key).trim(),
              String(value ?? '')
            ])
          )
        : {}
    )
  });
}

function normalizeThemeRules(list) {
  const rules = [];
  for (const [index, entry] of normalizeArray(list).entries()) {
    const normalized = normalizeThemeRule(entry, index);
    if (normalized) {
      rules.push(normalized);
    }
  }
  return Object.freeze(rules);
}

function normalizeComposableInterfaces(list) {
  return Object.freeze(
    normalizeArray(list)
      .map((entry) => String(entry).trim().toLowerCase())
      .filter((entry) => entry.length > 0)
  );
}

function normalizeHostManifest(parsedManifest, runtimeConfig, { reason = 'ok', source = '' } = {}) {
  const host = isObject(parsedManifest?.host) ? parsedManifest.host : {};
  const theming = isObject(parsedManifest?.theming) ? parsedManifest.theming : {};
  const enhancement = isObject(parsedManifest?.enhancements) ? parsedManifest.enhancements : {};
  const ecology = isObject(parsedManifest?.ecology) ? parsedManifest.ecology : {};
  const apiWindow = resolveCompatibilityWindow(parsedManifest?.api ?? {});
  const compatibility = evaluateCompatibilityWindow(apiWindow, RUNTIME_API_VERSION);

  const hostId = normalizeHostToken(host.id ?? runtimeConfig.hostId ?? 'spwashi.click', 'spwashi.click');
  const hostVersion = normalizeHostVersion(host.version ?? runtimeConfig.hostVersion ?? '');

  return Object.freeze({
    version: String(parsedManifest?.version ?? '1'),
    reason,
    source,
    host: Object.freeze({
      id: hostId,
      version: hostVersion
    }),
    api: Object.freeze({
      ...compatibility
    }),
    enhancements: Object.freeze({
      manifestPath: normalizeEnhancementPath(
        enhancement.manifestPath ?? enhancement.path ?? runtimeConfig.hostEnhancementManifestPath ?? ''
      ),
      prepend: enhancement.prepend === true
    }),
    ecology: Object.freeze({
      species: Object.freeze(normalizeSpeciesList(ecology.species))
    }),
    theming: Object.freeze({
      baseTokens: normalizeTokenMap(theming.baseTokens ?? theming.tokens ?? {}),
      combinations: normalizeThemeRules(theming.combinations),
      defaultRoutes: Object.freeze(
        normalizeArray(theming.defaultRoutes)
          .map((token) => String(token).trim().toLowerCase())
          .filter((value) => value.length > 0)
      )
    }),
    interfaces: Object.freeze({
      compose: normalizeComposableInterfaces(parsedManifest?.interfaces?.compose),
      required: normalizeComposableInterfaces(parsedManifest?.interfaces?.required)
    }),
    routes: Object.freeze(DEFAULT_ROUTES)
  });
}

export function createFallbackHostManifest(
  runtimeConfig = {},
  reason = 'host-manifest-disabled',
  source = '',
  { incompatible = false } = {}
) {
  const fallbackSeed = incompatible ? { api: { minRuntimeApi: '9999.0.0' } } : {};
  return normalizeHostManifest(fallbackSeed, runtimeConfig, { reason, source });
}

export async function loadHostManifest({
  runtimeConfig = {},
  fetchImpl = globalThis.fetch,
  assetVersion = ''
} = {}) {
  const manifestPath = normalizeEnhancementPath(runtimeConfig.hostManifestPath ?? '');
  if (!manifestPath) {
    if (runtimeConfig.hostManifestRequired === true) {
      return createFallbackHostManifest(
        runtimeConfig,
        'host-manifest-required-missing-path',
        manifestPath,
        { incompatible: true }
      );
    }
    return createFallbackHostManifest(runtimeConfig, 'host-manifest-disabled');
  }

  if (typeof fetchImpl !== 'function') {
    return createFallbackHostManifest(
      runtimeConfig,
      runtimeConfig.hostManifestRequired === true
        ? 'host-manifest-required-fetch-unavailable'
        : 'host-manifest-fetch-unavailable',
      manifestPath,
      { incompatible: runtimeConfig.hostManifestRequired === true }
    );
  }

  const resolvedPath = resolveRuntimeAssetUrl(manifestPath, runtimeConfig, { assetVersion });

  try {
    const response = await fetchImpl(resolvedPath, { cache: 'no-store' });
    if (!response.ok) {
      return createFallbackHostManifest(
        runtimeConfig,
        runtimeConfig.hostManifestRequired === true
          ? 'host-manifest-required-not-found'
          : 'host-manifest-not-found',
        resolvedPath,
        { incompatible: runtimeConfig.hostManifestRequired === true }
      );
    }

    const parsedManifest = await response.json();
    return normalizeHostManifest(parsedManifest, runtimeConfig, {
      reason: 'ok',
      source: resolvedPath
    });
  } catch {
    return createFallbackHostManifest(
      runtimeConfig,
      runtimeConfig.hostManifestRequired === true
        ? 'host-manifest-required-unreadable'
        : 'host-manifest-unreadable',
      resolvedPath,
      { incompatible: runtimeConfig.hostManifestRequired === true }
    );
  }
}
