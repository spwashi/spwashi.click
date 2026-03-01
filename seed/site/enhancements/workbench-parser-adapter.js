const FORM_PATTERN = /^([~!%^@#?&*.])([a-z0-9_-]+)?(?:\[([a-z0-9_.:+-]+)\])?\{([\s\S]*)\}$/;
const PARSE_METHODS = Object.freeze(['parseSpwForm', 'parseExpression', 'parse', 'parseWithLog']);

function fallbackParse(input) {
  const trimmed = String(input ?? '').trim();
  const match = trimmed.match(FORM_PATTERN);

  if (!match) {
    return {
      ok: false,
      parser: 'workbench-adapter-fallback',
      reason: 'form-mismatch',
      input: trimmed
    };
  }

  return {
    ok: true,
    parser: 'workbench-adapter-fallback',
    ast: {
      sigil: match[1],
      symbol: match[2] ?? '',
      selector: match[3] ?? '',
      body: match[4].trim()
    }
  };
}

function isRecord(value) {
  return typeof value === 'object' && value !== null;
}

function resolveFromHost(host) {
  if (typeof host === 'function') {
    return { parseFn: host, parseTarget: null, method: 'callable' };
  }

  if (!isRecord(host)) {
    return null;
  }

  const candidates = [
    host,
    host.parser,
    host.seed,
    host.seed?.parser,
    host.runtime,
    host.runtime?.parser
  ];

  for (const candidate of candidates) {
    if (!isRecord(candidate)) {
      continue;
    }

    for (const method of PARSE_METHODS) {
      if (typeof candidate[method] === 'function') {
        return {
          parseFn: candidate[method],
          parseTarget: candidate,
          method
        };
      }
    }
  }

  return null;
}

function resolveRuntimeParser() {
  const hosts = [
    globalThis.__SPW_WORKBENCH_RUNTIME__,
    globalThis.spwWorkbenchRuntime,
    globalThis.__spwWorkbenchParser,
    globalThis.spwWorkbenchParser,
    globalThis.__SPW_WORKBENCH__,
    globalThis.spwWorkbench,
    globalThis.SPW_WORKBENCH,
    globalThis.__SPW_RUNTIME__,
    globalThis.spwRuntime
  ];

  for (const host of hosts) {
    const resolved = resolveFromHost(host);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

export function parseSpwForm(input) {
  const resolved = resolveRuntimeParser();
  if (!resolved) {
    return fallbackParse(input);
  }

  try {
    const result =
      resolved.method === 'parseWithLog'
        ? resolved.parseFn.call(resolved.parseTarget, input, { format: () => '' })
        : resolved.parseFn.call(resolved.parseTarget, input);
    if (result && typeof result.then === 'function') {
      return fallbackParse(input);
    }

    return result ?? fallbackParse(input);
  } catch {
    return fallbackParse(input);
  }
}
