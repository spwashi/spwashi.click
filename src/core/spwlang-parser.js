/**
 * Intent:
 * Parse Spw-style copy as executable form, with optional delegation to a workbench-provided parser adapter.
 * Invariants:
 * Parser results are structured objects and fallback parsing is deterministic for the supported sigil-form subset.
 * How this composes with neighbors:
 * Pages annotate slot content validity and boot optionally installs a workbench parser adapter from seed enhancements.
 */

import { appendAssetVersion } from './release.js';

const SPW_SIGIL_PATTERN = /^[~!%^@#?&*.^]/;
const FALLBACK_FORM_PATTERN = /^([~!%^@#?&*.])([a-z0-9_-]+)?(?:\[([a-z0-9_.:+-]+)\])?\{([\s\S]*)\}$/;

let parserAdapter = null;

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
  if (rawResult && typeof rawResult === 'object' && 'ok' in rawResult) {
    return rawResult;
  }

  if (rawResult && typeof rawResult === 'object' && 'success' in rawResult) {
    return {
      ok: Boolean(rawResult.success),
      parser: parserName,
      ast: rawResult.ast ?? rawResult.value ?? null,
      reason: rawResult.error ?? null,
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

export async function installWorkbenchParserAdapter({ assetVersion = '' } = {}) {
  const adapterPath = appendAssetVersion(
    '/seed/site/enhancements/workbench-parser-adapter.js',
    assetVersion
  );

  try {
    const adapterModule = await import(adapterPath);
    const parseFn = adapterModule.parseSpwForm ?? adapterModule.parse ?? adapterModule.default;

    if (typeof parseFn !== 'function') {
      return {
        installed: false,
        reason: 'adapter-missing-parse-function'
      };
    }

    registerSpwParserAdapter('workbench-adapter', parseFn);
    return {
      installed: true,
      reason: 'adapter-loaded'
    };
  } catch {
    return {
      installed: false,
      reason: 'adapter-not-available'
    };
  }
}
