import { readRuntimeConfig, resolveRuntimeAssetUrl } from '../runtime/config.js';

const SPW_SIGIL_PATTERN = /^[~!%^@#?&*.^]/;
const FALLBACK_FORM_PATTERN = /^([~!%^@#?&*.])([a-z0-9_-]+)?(?:\[([a-z0-9_.:+-]+)\])?\{([\s\S]*)\}$/;

let parserAdapter = null;

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stripOuterQuotes(value) {
  const source = String(value ?? '');
  if (source.length < 2) {
    return source;
  }

  const first = source.charAt(0);
  const last = source.charAt(source.length - 1);
  const quoted =
    (first === '"' && last === '"') ||
    (first === '\'' && last === '\'') ||
    (first === '`' && last === '`');

  return quoted ? source.slice(1, -1) : source;
}

function tokenValue(token, { stripQuotes = false } = {}) {
  if (!isRecord(token) || typeof token.value !== 'string') {
    return '';
  }

  return stripQuotes ? stripOuterQuotes(token.value) : token.value;
}

function stringFromAstNode(node) {
  if (!isRecord(node)) {
    return '';
  }

  if (node.type === 'Parameter') {
    if (isRecord(node.name) && typeof node.name.value === 'string') {
      return stripOuterQuotes(node.name.value);
    }
    return stringFromAstNode(node.value);
  }

  if (node.type === 'Literal') {
    return tokenValue(node.token, { stripQuotes: true });
  }

  if (node.type === 'Identifier') {
    return tokenValue(node.token, { stripQuotes: true });
  }

  if (node.type === 'Reference' && Array.isArray(node.path)) {
    return node.path
      .map((segment) => tokenValue(segment, { stripQuotes: true }))
      .filter((value) => value.length > 0)
      .join('.');
  }

  if (node.type === 'Wildcard') {
    return '*';
  }

  if (node.type === 'Spread') {
    return '...';
  }

  return '';
}

function firstOperationNode(node) {
  if (!isRecord(node)) {
    return null;
  }

  if (node.type === 'Operation') {
    return node;
  }

  if (node.type === 'Seed') {
    return firstOperationNode(node.expression);
  }

  if (node.type === 'Expression' && Array.isArray(node.terms)) {
    for (const term of node.terms) {
      const operation = firstOperationNode(term);
      if (operation) {
        return operation;
      }
    }
  }

  if (node.type === 'Sequence' && Array.isArray(node.expressions)) {
    for (const expression of node.expressions) {
      const operation = firstOperationNode(expression);
      if (operation) {
        return operation;
      }
    }
  }

  if (node.type === 'Body' && isRecord(node.sequence)) {
    return firstOperationNode(node.sequence);
  }

  if (node.type === 'Scope' && isRecord(node.sequence)) {
    return firstOperationNode(node.sequence);
  }

  return null;
}

function canonicalAstFromInput(input) {
  const trimmed = String(input ?? '').trim();
  const match = trimmed.match(FALLBACK_FORM_PATTERN);

  if (!match) {
    return null;
  }

  return Object.freeze({
    sigil: match[1],
    symbol: match[2] ?? '',
    selector: match[3] ?? '',
    body: match[4].trim()
  });
}

function canonicalAstFromWorkbenchAst(input, workbenchAst) {
  if (!isRecord(workbenchAst)) {
    return canonicalAstFromInput(input);
  }

  if (
    typeof workbenchAst.sigil === 'string' &&
    typeof workbenchAst.symbol === 'string' &&
    typeof workbenchAst.selector === 'string' &&
    typeof workbenchAst.body === 'string'
  ) {
    return Object.freeze({
      sigil: workbenchAst.sigil,
      symbol: workbenchAst.symbol,
      selector: workbenchAst.selector,
      body: workbenchAst.body
    });
  }

  const operation = firstOperationNode(workbenchAst);
  const fallbackAst = canonicalAstFromInput(input);
  if (!operation) {
    return fallbackAst;
  }

  let symbol = fallbackAst?.symbol ?? '';
  if (
    isRecord(operation.modifiers) &&
    Array.isArray(operation.modifiers.modifiers) &&
    operation.modifiers.modifiers.length > 0
  ) {
    const modifierChain = operation.modifiers.modifiers
      .map((modifier) => tokenValue(modifier, { stripQuotes: true }))
      .filter((value) => value.length > 0);
    if (modifierChain.length > 0) {
      symbol = modifierChain.join('.');
    }
  } else if (isRecord(operation.operatorLabel) && typeof operation.operatorLabel.value === 'string') {
    symbol = stripOuterQuotes(operation.operatorLabel.value);
  }

  let selector = fallbackAst?.selector ?? '';
  if (isRecord(operation.frame) && Array.isArray(operation.frame.content)) {
    const firstFrameNode = operation.frame.content[0];
    const derivedSelector = stringFromAstNode(firstFrameNode);
    if (derivedSelector.length > 0) {
      selector = derivedSelector;
    }
  }

  return Object.freeze({
    sigil: tokenValue(operation.operator, { stripQuotes: true }) || fallbackAst?.sigil || '',
    symbol,
    selector,
    body: fallbackAst?.body ?? ''
  });
}

function fallbackParse(input) {
  const trimmed = String(input ?? '').trim();
  const match = trimmed.match(FALLBACK_FORM_PATTERN);

  if (!match) {
    return {
      ok: false,
      parser: 'fallback',
      reason: 'not-a-supported-form',
      input: trimmed
    };
  }

  return {
    ok: true,
    parser: 'fallback',
    ast: Object.freeze({
      sigil: match[1],
      symbol: match[2] ?? '',
      selector: match[3] ?? '',
      body: match[4].trim()
    })
  };
}

function adaptResult(input, rawResult, parserName) {
  if (isRecord(rawResult) && 'ok' in rawResult) {
    const ok = Boolean(rawResult.ok);
    return {
      ...rawResult,
      ok,
      parser: typeof rawResult.parser === 'string' ? rawResult.parser : parserName,
      ast: ok ? canonicalAstFromWorkbenchAst(input, rawResult.ast) : rawResult.ast ?? null,
      input: typeof rawResult.input === 'string' ? rawResult.input : input
    };
  }

  if (isRecord(rawResult) && 'success' in rawResult) {
    let reason = rawResult.error ?? null;
    if (isRecord(reason) && typeof reason.message === 'string') {
      reason = reason.message;
    }

    const ok = Boolean(rawResult.success);
    if (!ok && !reason && Array.isArray(rawResult.errors) && rawResult.errors.length > 0) {
      const firstError = rawResult.errors[0];
      if (isRecord(firstError?.data) && typeof firstError.data.message === 'string') {
        reason = firstError.data.message;
      } else if (typeof firstError?.message === 'string') {
        reason = firstError.message;
      }
    }

    return {
      ok,
      parser: parserName,
      ast: ok ? canonicalAstFromWorkbenchAst(input, rawResult.ast ?? rawResult.value ?? null) : null,
      reason,
      input
    };
  }

  if (isRecord(rawResult) && ('type' in rawResult || 'sigil' in rawResult)) {
    return {
      ok: true,
      parser: parserName,
      ast: canonicalAstFromWorkbenchAst(input, rawResult),
      input
    };
  }

  return {
    ok: false,
    parser: parserName,
    reason: 'adapter-return-shape-invalid',
    input
  };
}

export function isLikelySpwForm(input) {
  const trimmed = String(input ?? '').trim();
  return SPW_SIGIL_PATTERN.test(trimmed) && trimmed.includes('{') && trimmed.endsWith('}');
}

export function registerSpwParserAdapter(name, parseFn) {
  if (typeof parseFn !== 'function') {
    throw new TypeError('registerSpwParserAdapter requires a parse function');
  }

  parserAdapter = {
    name,
    parse: parseFn
  };

  return parserAdapter;
}

export function clearSpwParserAdapter() {
  parserAdapter = null;
}

export function parseSpwForm(input) {
  const normalizedInput = String(input ?? '');

  if (parserAdapter) {
    try {
      const rawResult = parserAdapter.parse(normalizedInput);
      if (rawResult && typeof rawResult.then === 'function') {
        return {
          ok: false,
          parser: parserAdapter.name,
          reason: 'adapter-returned-promise',
          input: normalizedInput
        };
      }
      return adaptResult(normalizedInput, rawResult, parserAdapter.name);
    } catch (error) {
      return {
        ok: false,
        parser: parserAdapter.name,
        reason: error instanceof Error ? error.message : String(error),
        input: normalizedInput
      };
    }
  }

  return fallbackParse(normalizedInput);
}

let workbenchCapabilities = null;

export function getWorkbenchCapabilities() {
  return workbenchCapabilities;
}

export function spwQuery(selectorOrPattern, ast) {
  const caps = workbenchCapabilities;
  if (!caps?.matchAll || !caps?.spwq) {
    return null;
  }

  const pattern = typeof selectorOrPattern === 'string'
    ? caps.spwq(selectorOrPattern)
    : selectorOrPattern;
  return caps.matchAll(pattern, ast);
}

export function lexSpwInput(input, options) {
  const caps = workbenchCapabilities;
  if (!caps?.lex) {
    return null;
  }

  return caps.lex(input, options);
}

export function walkSpwAst(ast, visitor) {
  const caps = workbenchCapabilities;
  if (!caps?.walkAST) {
    return;
  }

  caps.walkAST(ast, visitor);
}

export function canonicalizeSpwForm(input, options) {
  const caps = workbenchCapabilities;
  if (!caps?.canonicalize) {
    return null;
  }

  return caps.canonicalize(input, options);
}

export function parseSpwStream(input) {
  const caps = workbenchCapabilities;
  if (!caps?.parseStream) {
    return null;
  }

  return caps.parseStream(input);
}

export async function installWorkbenchParserAdapter({
  assetVersion = '',
  runtimeConfig = readRuntimeConfig()
} = {}) {
  const adapterPath = resolveRuntimeAssetUrl(
    '/seed/site/enhancements/workbench-parser-adapter.js',
    runtimeConfig,
    { assetVersion }
  );

  try {
    const adapterModule = await import(adapterPath);
    const adapterCandidates = [
      ['parseSpwForm', adapterModule.parseSpwForm],
      ['parseExpression', adapterModule.parseExpression],
      ['parse', adapterModule.parse],
      ['parser.parseSpwForm', adapterModule.parser?.parseSpwForm],
      ['parser.parseExpression', adapterModule.parser?.parseExpression],
      ['parser.parse', adapterModule.parser?.parse],
      ['seed.parser.parseSpwForm', adapterModule.seed?.parser?.parseSpwForm],
      ['seed.parser.parseExpression', adapterModule.seed?.parser?.parseExpression],
      ['seed.parser.parse', adapterModule.seed?.parser?.parse],
      ['parseWithLog', adapterModule.parseWithLog],
      ['default', adapterModule.default]
    ];
    let [adapterExport, parseFn] =
      adapterCandidates.find(([_name, value]) => typeof value === 'function') ?? [];

    if (adapterExport === 'parseWithLog') {
      const parseWithLog = parseFn;
      parseFn = (input) => parseWithLog(input, { format: () => '' });
    }

    if (typeof parseFn !== 'function') {
      return {
        installed: false,
        reason: 'adapter-missing-parse-function',
        adapterPath
      };
    }

    registerSpwParserAdapter('workbench-adapter', parseFn);

    if (typeof adapterModule.resolveWorkbenchCapabilities === 'function') {
      workbenchCapabilities = adapterModule.resolveWorkbenchCapabilities();
    }

    return {
      installed: true,
      reason: 'adapter-loaded',
      adapterPath,
      adapterExport,
      capabilities: workbenchCapabilities
        ? Object.keys(workbenchCapabilities).filter((k) => workbenchCapabilities[k] != null)
        : []
    };
  } catch (error) {
    return {
      installed: false,
      reason: 'adapter-not-available',
      adapterPath,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
