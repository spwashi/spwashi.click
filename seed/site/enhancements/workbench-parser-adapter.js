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

const HOST_NAMESPACES = Object.freeze([
  '__SPW_WORKBENCH_RUNTIME__',
  'spwWorkbenchRuntime',
  '__spwWorkbenchParser',
  'spwWorkbenchParser',
  '__SPW_WORKBENCH__',
  'spwWorkbench',
  'SPW_WORKBENCH',
  '__SPW_RUNTIME__',
  'spwRuntime'
]);

function resolveWorkbenchHost() {
  for (const key of HOST_NAMESPACES) {
    const host = globalThis[key];
    if (isRecord(host) || typeof host === 'function') {
      return host;
    }
  }
  return null;
}

function resolveRuntimeParser() {
  for (const key of HOST_NAMESPACES) {
    const host = globalThis[key];
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

function pluckFn(host, ...paths) {
  for (const path of paths) {
    const parts = path.split('.');
    let target = host;
    for (const part of parts) {
      if (!isRecord(target)) { target = undefined; break; }
      target = target[part];
    }
    if (typeof target === 'function') {
      return target.bind(host);
    }
  }
  return null;
}

function pluckValue(host, ...paths) {
  for (const path of paths) {
    const parts = path.split('.');
    let target = host;
    for (const part of parts) {
      if (!isRecord(target)) { target = undefined; break; }
      target = target[part];
    }
    if (target !== undefined && target !== null) {
      return target;
    }
  }
  return null;
}

export function resolveWorkbenchCapabilities() {
  const host = resolveWorkbenchHost();
  if (!host) {
    return null;
  }

  const seed = isRecord(host.seed) ? host.seed : host;

  return {
    lex: pluckFn(seed, 'lex'),
    tokenize: pluckFn(seed, 'tokenize'),
    parseStream: pluckFn(seed, 'parseStream'),
    parseWithLog: pluckFn(seed, 'parseWithLog'),
    parseExpression: pluckFn(seed, 'parseExpression'),
    parse: pluckFn(seed, 'parse'),

    canonicalize: pluckFn(seed, 'canonicalize'),
    desugar: pluckFn(seed, 'desugar'),
    parseDesugared: pluckFn(seed, 'parseDesugared'),

    walkAST: pluckFn(seed, 'walkAST'),
    findNodes: pluckFn(seed, 'findNodes'),
    countNodeTypes: pluckFn(seed, 'countNodeTypes'),
    printAST: pluckFn(seed, 'printAST'),
    getMaxDepth: pluckFn(seed, 'getMaxDepth'),
    auditAST: pluckFn(seed, 'auditAST'),
    previewAST: pluckFn(seed, 'previewAST'),

    spwq: pluckFn(seed, 'spwq'),
    matchAll: pluckFn(seed, 'matchAll'),
    matchAt: pluckFn(seed, 'matchAt'),
    parseSelector: pluckFn(seed, 'parseSelector'),

    textFormatter: pluckValue(seed, 'textFormatter'),
    jsonFormatter: pluckValue(seed, 'jsonFormatter'),
    compactFormatter: pluckValue(seed, 'compactFormatter'),

    filterEvents: pluckFn(seed, 'filterEvents'),
    extractTokens: pluckFn(seed, 'extractTokens'),
    extractErrors: pluckFn(seed, 'extractErrors'),
    buildTrace: pluckFn(seed, 'buildTrace')
  };
}
