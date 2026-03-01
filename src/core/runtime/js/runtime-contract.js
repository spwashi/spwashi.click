const VERSION_PATTERN = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?/;

export const RUNTIME_API_VERSION = '1.1.0';

export const RUNTIME_INTERFACE_VERSIONS = Object.freeze({
  core: '1.1.0',
  catalog: '1.0.0',
  integration: '1.1.0',
  ecology: '1.0.0',
  theming: '1.0.0',
  host: '1.0.0'
});

function parseVersion(value) {
  const text = String(value ?? '').trim();
  const match = text.match(VERSION_PATTERN);

  if (!match) {
    return [0, 0, 0];
  }

  return [
    Number.parseInt(match[1] ?? '0', 10),
    Number.parseInt(match[2] ?? '0', 10),
    Number.parseInt(match[3] ?? '0', 10)
  ];
}

export function compareVersion(a, b) {
  const parsedA = parseVersion(a);
  const parsedB = parseVersion(b);

  for (let index = 0; index < parsedA.length; index += 1) {
    if (parsedA[index] > parsedB[index]) {
      return 1;
    }

    if (parsedA[index] < parsedB[index]) {
      return -1;
    }
  }

  return 0;
}

function normalizeVersionToken(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : '';
}

export function isVersionInRange(version, { min = '', max = '' } = {}) {
  const normalizedVersion = normalizeVersionToken(version);
  if (!normalizedVersion) {
    return false;
  }

  const minVersion = normalizeVersionToken(min);
  if (minVersion && compareVersion(normalizedVersion, minVersion) < 0) {
    return false;
  }

  const maxVersion = normalizeVersionToken(max);
  if (maxVersion && compareVersion(normalizedVersion, maxVersion) > 0) {
    return false;
  }

  return true;
}

export function createRuntimeApiContract({
  runtimeApiVersion = RUNTIME_API_VERSION,
  interfaces = RUNTIME_INTERFACE_VERSIONS
} = {}) {
  return Object.freeze({
    runtimeApiVersion,
    interfaces: Object.freeze({ ...interfaces })
  });
}

export function resolveCompatibilityWindow(source = {}) {
  return Object.freeze({
    min: normalizeVersionToken(source.minRuntimeApi ?? source.minApiVersion ?? source.min ?? ''),
    max: normalizeVersionToken(source.maxRuntimeApi ?? source.maxApiVersion ?? source.max ?? '')
  });
}

export function evaluateCompatibilityWindow(window, runtimeApiVersion = RUNTIME_API_VERSION) {
  const compatibilityWindow = resolveCompatibilityWindow(window);
  const compatible = isVersionInRange(runtimeApiVersion, compatibilityWindow);

  return Object.freeze({
    compatible,
    minRuntimeApi: compatibilityWindow.min,
    maxRuntimeApi: compatibilityWindow.max
  });
}
