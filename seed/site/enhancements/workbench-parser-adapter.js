const FORM_PATTERN = /^([~!%^@#?&*.])([a-z0-9_-]+)?(?:\[([a-z0-9_.:+-]+)\])?\{([\s\S]*)\}$/;

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

export function parseSpwForm(input) {
  const runtimeParser = globalThis.__spwWorkbenchParser;

  if (runtimeParser && typeof runtimeParser.parseSpwForm === 'function') {
    return runtimeParser.parseSpwForm(input);
  }

  return fallbackParse(input);
}
