import { parseSpwForm } from './spwlang-parser.js';

const SYMBOL_METHOD = Object.freeze({
  top: 'setTopLevel',
  state: 'setTopLevel',
  scene: 'setTopLevel',
  region: 'setRegion',
  node: 'setRegion',
  component: 'setComponent',
  comp: 'setComponent',
  vars: 'setWindowVars',
  window: 'setWindowVars',
  css: 'setWindowVars',
  reset: 'resetRuntime',
  rebind: 'rebindRuntime',
  catalog: 'getCatalog',
  status: 'getIntegrationStatus',
  integration: 'getIntegrationStatus',
  bridge: 'getIntegrationStatus',
  contract: 'getApiContract',
  interfaces: 'listInterfaces',
  compose: 'composeInterface',
  ecology: 'getEcologySnapshot',
  species: 'registerEcologySpecies',
  lifecycle: 'noteEcologyLifecycle',
  registers: 'listRegisters',
  register: 'setRegister',
  focus: 'focusRegister',
  extract: 'extractRegister',
  deposit: 'depositRegister',
  mark: 'markRegister',
  markget: 'getMark',
  getregister: 'getRegister',
  promote: 'promoteRegister',
  demote: 'demoteRegister',
  couple: 'coupleRegisters',
  measure: 'measureRegister',
  viewport: 'setViewportMode',
  mobile: 'setViewportMode',
  theme: 'getHostThemeState',
  manifest: 'getHostManifest'
});

const VALUE_PATTERN =
  /([a-zA-Z0-9_.-]+|--[a-zA-Z0-9_-]+)\s*:\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|[^\s,\n;]+)/g;

function normalizeSymbol(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
}

function toCamelCase(value) {
  return String(value ?? '')
    .trim()
    .replace(/[-_]+([a-z0-9])/gi, (_match, group) => group.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}

function stripQuotes(value) {
  const text = String(value ?? '').trim();
  if (text.length < 2) {
    return text;
  }

  const first = text.charAt(0);
  const last = text.charAt(text.length - 1);
  const quoted =
    (first === '"' && last === '"') ||
    (first === '\'' && last === '\'') ||
    (first === '`' && last === '`');

  if (!quoted) {
    return text;
  }

  const inner = text.slice(1, -1);
  return inner
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, '\'')
    .replace(/\\\\/g, '\\');
}

function coerceScalar(value) {
  const text = stripQuotes(value);
  const lower = text.toLowerCase();

  if (lower === 'true') {
    return true;
  }

  if (lower === 'false') {
    return false;
  }

  if (lower === 'null') {
    return null;
  }

  if (lower === 'undefined') {
    return undefined;
  }

  if (/^-?\d+(\.\d+)?$/.test(text)) {
    return Number(text);
  }

  if (text.includes('|') && !text.includes('://')) {
    const values = text.split('|').map((token) => token.trim()).filter((token) => token.length > 0);
    if (values.length > 1) {
      return values;
    }
  }

  return text;
}

function parseBodyPairs(body) {
  const source = String(body ?? '');
  const pairs = {};
  VALUE_PATTERN.lastIndex = 0;

  let match = VALUE_PATTERN.exec(source);
  while (match) {
    const key = match[1];
    const value = coerceScalar(match[2]);
    pairs[key] = value;
    match = VALUE_PATTERN.exec(source);
  }

  return pairs;
}

function normalizeControlKey(key) {
  return String(key ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function mapTopLevelConfig(pairs) {
  const config = {};

  for (const [key, value] of Object.entries(pairs)) {
    const normalized = normalizeControlKey(key);

    if (normalized === 'route') {
      config.route = value;
      continue;
    }

    if (normalized === 'clicks' || normalized === 'clickcount' || normalized === 'count') {
      config.clickCount = value;
      continue;
    }

    if (normalized === 'reduced' || normalized === 'reducedmotion') {
      config.reducedMotion = Boolean(value);
      continue;
    }

    if (
      normalized === 'profile' ||
      normalized === 'perf' ||
      normalized === 'performance' ||
      normalized === 'performanceprofile'
    ) {
      config.performanceProfile = value;
      continue;
    }

    if (normalized === 'llm' || normalized === 'structure' || normalized === 'llmreadablestructure') {
      config.llmReadableStructure = Boolean(value);
    }
  }

  return config;
}

function mapRegionPayload(selectorHint, pairs) {
  const attributes = {};
  const dataset = {};
  const style = {};
  const payload = {
    selector: selectorHint || '',
    all: false,
    params: {}
  };

  for (const [key, value] of Object.entries(pairs)) {
    if (key === 'selector') {
      payload.selector = String(value ?? '');
      continue;
    }

    if (key === 'all' || key === 'many') {
      payload.all = Boolean(value);
      continue;
    }

    if (key === 'text') {
      payload.params.text = value === undefined ? '' : String(value);
      continue;
    }

    if (key.startsWith('attr.')) {
      const attrName = key.slice(5);
      if (attrName) {
        attributes[attrName] = value;
      }
      continue;
    }

    if (key.startsWith('aria.')) {
      const ariaName = key.slice(5);
      if (ariaName) {
        attributes[`aria-${ariaName}`] = value;
      }
      continue;
    }

    if (key.startsWith('data.')) {
      const dataName = toCamelCase(key.slice(5));
      if (dataName) {
        dataset[dataName] = value;
      }
      continue;
    }

    if (key.startsWith('style.')) {
      const styleName = key.slice(6);
      if (styleName) {
        style[styleName] = value;
      }
      continue;
    }
  }

  if (Object.keys(attributes).length > 0) {
    payload.params.attributes = attributes;
  }

  if (Object.keys(dataset).length > 0) {
    payload.params.dataset = dataset;
  }

  if (Object.keys(style).length > 0) {
    payload.params.style = style;
  }

  return payload;
}

function mapComponentPayload(selectorHint, pairs) {
  const payload = mapRegionPayload(selectorHint, pairs);

  if (!payload.selector && typeof pairs.tag === 'string') {
    payload.tagName = pairs.tag;
  }

  return payload;
}

function toCssVariableName(key) {
  if (key.startsWith('--')) {
    return key;
  }

  if (key.startsWith('var.')) {
    return `--${key.slice(4).replace(/_/g, '-')}`;
  }

  return '';
}

function mapWindowVars(pairs) {
  const vars = {};

  for (const [key, value] of Object.entries(pairs)) {
    const variableName = toCssVariableName(key);
    if (!variableName) {
      continue;
    }
    vars[variableName] = value;
  }

  return vars;
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string' && value.length > 0) {
    return value.split('|').map((token) => token.trim()).filter((token) => token.length > 0);
  }

  return [];
}

function mapRegisterSpeciesPayload(selectorHint, pairs) {
  const tagName =
    String(pairs.tagName ?? pairs.tag ?? selectorHint ?? '')
      .trim();

  const payload = {
    tagName
  };

  if (typeof pairs.role === 'string' && pairs.role.length > 0) {
    payload.role = pairs.role;
  }

  const dependsOn = toArray(pairs.dependsOn ?? pairs.depends);
  if (dependsOn.length > 0) {
    payload.dependsOn = dependsOn;
  }

  const emits = toArray(pairs.emits ?? pairs.events);
  if (emits.length > 0) {
    payload.emits = emits;
  }

  return payload;
}

function mapLifecyclePayload(selectorHint, pairs) {
  const detail = {};
  for (const [key, value] of Object.entries(pairs)) {
    if (!key.startsWith('detail.')) {
      continue;
    }

    const detailKey = key.slice(7);
    if (!detailKey) {
      continue;
    }
    detail[detailKey] = value;
  }

  return {
    tagName: String(pairs.tagName ?? pairs.tag ?? selectorHint ?? '').trim(),
    lifecycle: String(pairs.lifecycle ?? pairs.event ?? '').trim(),
    detail
  };
}

function mapComposePayload(selectorHint, pairs) {
  const interfaces = [];

  if (selectorHint) {
    interfaces.push(...toArray(selectorHint));
  }

  interfaces.push(...toArray(pairs.interfaces ?? pairs.names ?? pairs.interface));

  return {
    interfaces: Array.from(new Set(interfaces.map((value) => String(value).trim()).filter(Boolean)))
  };
}

function mapRegisterPayload(selectorHint, pairs) {
  const key = String(pairs.key ?? pairs.register ?? selectorHint ?? '').trim();
  const source = String(pairs.source ?? '').trim();
  const topLevel = mapTopLevelConfig(pairs);
  const payload = {};

  if (key) {
    payload.key = key;
  }

  if (source) {
    payload.source = source;
  }

  if (Object.keys(topLevel).length > 0) {
    payload.value = { topLevel };
  } else if (pairs.value !== undefined) {
    payload.value = pairs.value;
  } else if (pairs.text !== undefined) {
    payload.value = String(pairs.text);
  }

  return payload;
}

function mapRegisterKeyPayload(selectorHint, pairs) {
  const key = String(pairs.key ?? pairs.register ?? selectorHint ?? '').trim();
  return key ? { key } : {};
}

function mapMarkPayload(selectorHint, pairs) {
  const payload = {
    name: String(pairs.name ?? pairs.mark ?? selectorHint ?? '').trim()
  };
  const key = String(pairs.key ?? pairs.register ?? '').trim();
  if (key) {
    payload.key = key;
  }
  return payload;
}

function mapCouplePayload(selectorHint, pairs) {
  const fromKey = String(pairs.key ?? pairs.a ?? pairs.left ?? selectorHint ?? '').trim();
  const withKey = String(pairs.with ?? pairs.to ?? pairs.b ?? pairs.right ?? '').trim();
  const payload = {};
  if (fromKey) {
    payload.key = fromKey;
  }
  if (withKey) {
    payload.with = withKey;
  }
  return payload;
}

function mapMeasurePayload(selectorHint, pairs) {
  const key = String(pairs.key ?? pairs.register ?? selectorHint ?? '').trim();
  const payload = {};
  if (key) {
    payload.key = key;
  }
  if (pairs.scale !== undefined) {
    payload.scale = pairs.scale;
  } else if (pairs.max !== undefined) {
    payload.scale = pairs.max;
  }
  return payload;
}

function mapViewportPayload(selectorHint, pairs) {
  const payload = {};
  const mode = String(pairs.mode ?? selectorHint ?? '').trim();
  if (mode) {
    payload.mode = mode;
  }
  if (pairs.band !== undefined) {
    payload.band = String(pairs.band).trim();
  }
  if (pairs.mobile !== undefined) {
    payload.mobile = Boolean(pairs.mobile);
  }
  if (pairs.width !== undefined) {
    payload.width = pairs.width;
  }
  if (pairs.height !== undefined) {
    payload.height = pairs.height;
  }
  if (pairs.reason !== undefined) {
    payload.reason = String(pairs.reason);
  }

  return payload;
}

function parseCommandExpression(expression) {
  const source = String(expression ?? '').trim();
  if (source.length === 0) {
    return {
      ok: false,
      error: 'Empty Spw command.'
    };
  }

  const parsed = parseSpwForm(source);
  if (!parsed.ok) {
    return {
      ok: false,
      error: `Spw parse failed (${parsed.reason ?? 'unknown'})`,
      parsed
    };
  }

  const ast = parsed.ast ?? {};
  const symbol = normalizeSymbol(ast.symbol);
  const selector = String(ast.selector ?? '').trim();
  const pairs = parseBodyPairs(ast.body ?? '');
  const method = SYMBOL_METHOD[symbol] ?? '';

  if (!method) {
    return {
      ok: false,
      error: `Unsupported Spw runtime symbol: ${symbol || '(missing)'}`,
      parsed
    };
  }

  if (method === 'setTopLevel') {
    return {
      ok: true,
      command: symbol,
      method,
      payload: mapTopLevelConfig(pairs),
      parsed
    };
  }

  if (method === 'setRegion') {
    return {
      ok: true,
      command: symbol,
      method,
      payload: mapRegionPayload(selector, pairs),
      parsed
    };
  }

  if (method === 'setComponent') {
    return {
      ok: true,
      command: symbol,
      method,
      payload: mapComponentPayload(selector, pairs),
      parsed
    };
  }

  if (method === 'setWindowVars') {
    return {
      ok: true,
      command: symbol,
      method,
      payload: mapWindowVars(pairs),
      parsed
    };
  }

  if (method === 'resetRuntime') {
    return {
      ok: true,
      command: symbol,
      method,
      payload: mapTopLevelConfig(pairs),
      parsed
    };
  }

  if (method === 'getCatalog') {
    return {
      ok: true,
      command: symbol,
      method,
      payload: {
        summaryOnly:
          pairs.summaryOnly === true ||
          pairs.summary === true ||
          pairs.mini === true ||
          pairs.compact === true
      },
      parsed
    };
  }

  if (
    method === 'getApiContract' ||
    method === 'listInterfaces' ||
    method === 'getEcologySnapshot' ||
    method === 'getHostThemeState' ||
    method === 'getHostManifest'
  ) {
    return {
      ok: true,
      command: symbol,
      method,
      payload: {},
      parsed
    };
  }

  if (method === 'getIntegrationStatus') {
    return {
      ok: true,
      command: symbol,
      method,
      payload: {},
      parsed
    };
  }

  if (method === 'composeInterface') {
    return {
      ok: true,
      command: symbol,
      method,
      payload: mapComposePayload(selector, pairs),
      parsed
    };
  }

  if (method === 'setRegister') {
    return {
      ok: true,
      command: symbol,
      method,
      payload: mapRegisterPayload(selector, pairs),
      parsed
    };
  }

  if (method === 'focusRegister' || method === 'extractRegister' || method === 'depositRegister' || method === 'getRegister' || method === 'promoteRegister' || method === 'demoteRegister') {
    return {
      ok: true,
      command: symbol,
      method,
      payload: mapRegisterKeyPayload(selector, pairs),
      parsed
    };
  }

  if (method === 'markRegister' || method === 'getMark') {
    return {
      ok: true,
      command: symbol,
      method,
      payload: mapMarkPayload(selector, pairs),
      parsed
    };
  }

  if (method === 'coupleRegisters') {
    return {
      ok: true,
      command: symbol,
      method,
      payload: mapCouplePayload(selector, pairs),
      parsed
    };
  }

  if (method === 'measureRegister') {
    return {
      ok: true,
      command: symbol,
      method,
      payload: mapMeasurePayload(selector, pairs),
      parsed
    };
  }

  if (method === 'listRegisters') {
    return {
      ok: true,
      command: symbol,
      method,
      payload: {
        includeValues: pairs.includeValues === true || pairs.values === true || pairs.full === true
      },
      parsed
    };
  }

  if (method === 'setViewportMode') {
    return {
      ok: true,
      command: symbol,
      method,
      payload: mapViewportPayload(selector, pairs),
      parsed
    };
  }

  if (method === 'registerEcologySpecies') {
    return {
      ok: true,
      command: symbol,
      method,
      payload: mapRegisterSpeciesPayload(selector, pairs),
      parsed
    };
  }

  if (method === 'noteEcologyLifecycle') {
    return {
      ok: true,
      command: symbol,
      method,
      payload: mapLifecyclePayload(selector, pairs),
      parsed
    };
  }

  return {
    ok: true,
    command: symbol,
    method,
    payload: {},
    parsed
  };
}

export function runSpwRuntimeCommand({ expression, runtimeApi }) {
  if (!runtimeApi || typeof runtimeApi !== 'object') {
    return {
      ok: false,
      error: 'Runtime API is unavailable.'
    };
  }

  const parsedCommand = parseCommandExpression(expression);
  if (!parsedCommand.ok) {
    return parsedCommand;
  }

  const { method, payload, command, parsed } = parsedCommand;

  if (method === 'setTopLevel') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.setTopLevel(payload),
      parser: parsed.parser
    };
  }

  if (method === 'setRegion') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.setRegion(payload),
      parser: parsed.parser
    };
  }

  if (method === 'setComponent') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.setComponent(payload),
      parser: parsed.parser
    };
  }

  if (method === 'setWindowVars') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.setWindowVars(payload),
      parser: parsed.parser
    };
  }

  if (method === 'resetRuntime') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.resetRuntime(payload),
      parser: parsed.parser
    };
  }

  if (method === 'rebindRuntime') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.rebindRuntime(),
      parser: parsed.parser
    };
  }

  if (method === 'getCatalog') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.getCatalog(payload),
      parser: parsed.parser
    };
  }

  if (method === 'getIntegrationStatus') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.getIntegrationStatus(),
      parser: parsed.parser
    };
  }

  if (method === 'getApiContract') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.getApiContract(),
      parser: parsed.parser
    };
  }

  if (method === 'listInterfaces') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.listInterfaces(),
      parser: parsed.parser
    };
  }

  if (method === 'composeInterface') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.composeInterface(payload),
      parser: parsed.parser
    };
  }

  if (method === 'setRegister') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.setRegister(payload),
      parser: parsed.parser
    };
  }

  if (method === 'focusRegister') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.focusRegister(payload),
      parser: parsed.parser
    };
  }

  if (method === 'extractRegister') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.extractRegister(payload),
      parser: parsed.parser
    };
  }

  if (method === 'depositRegister') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.depositRegister(payload),
      parser: parsed.parser
    };
  }

  if (method === 'markRegister') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.markRegister(payload),
      parser: parsed.parser
    };
  }

  if (method === 'getMark') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.getMark(payload),
      parser: parsed.parser
    };
  }

  if (method === 'getRegister') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.getRegister(payload),
      parser: parsed.parser
    };
  }

  if (method === 'promoteRegister') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.promoteRegister(payload),
      parser: parsed.parser
    };
  }

  if (method === 'demoteRegister') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.demoteRegister(payload),
      parser: parsed.parser
    };
  }

  if (method === 'coupleRegisters') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.coupleRegisters(payload),
      parser: parsed.parser
    };
  }

  if (method === 'measureRegister') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.measureRegister(payload),
      parser: parsed.parser
    };
  }

  if (method === 'listRegisters') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.listRegisters(payload),
      parser: parsed.parser
    };
  }

  if (method === 'setViewportMode') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.setViewportMode(payload),
      parser: parsed.parser
    };
  }

  if (method === 'getEcologySnapshot') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.getEcologySnapshot(),
      parser: parsed.parser
    };
  }

  if (method === 'registerEcologySpecies') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.registerEcologySpecies(payload),
      parser: parsed.parser
    };
  }

  if (method === 'noteEcologyLifecycle') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.noteEcologyLifecycle(payload),
      parser: parsed.parser
    };
  }

  if (method === 'getHostThemeState') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.getHostThemeState(),
      parser: parsed.parser
    };
  }

  if (method === 'getHostManifest') {
    return {
      ok: true,
      command,
      method,
      payload,
      result: runtimeApi.getHostManifest(),
      parser: parsed.parser
    };
  }

  return {
    ok: false,
    error: `Unsupported runtime method resolution: ${method}`
  };
}
