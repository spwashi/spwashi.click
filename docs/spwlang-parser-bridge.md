# Spwlang Parser Bridge

This site treats key copy strings as executable forms.

## Runtime Path

- Core bridge: `src/core/spwlang-parser.js`
- Optional adapter module: `seed/site/enhancements/workbench-parser-adapter.js`

Boot sequence attempts adapter load first. If unavailable, fallback parser handles the supported sigil-form subset.

Bridge status is emitted as a typed runtime event: `spw:workbench:parser:state`.
Bridge status is also queryable via runtime control: `window.__SPW_RUNTIME__.getIntegrationStatus()`.
Both include host metadata (`hostId`, `hostVersion`) so multi-repo embeddings remain traceable.

## Why This Exists

- Keep UI language aligned with the `seed/extern/spw-workbench` north star.
- Ensure copy can be parsed, not only read.
- Preserve deterministic behavior even when external parser artifacts are absent.

## Adapter Contract

`workbench-parser-adapter.js` should export one of:

- `parseSpwForm(input)`
- `parseExpression(input)`
- `parse(input)`
- default function

Return shape accepted:

- `{ ok: boolean, ast?: object, reason?: string }`
- `{ success: boolean, ast?: object, value?: object, error?: string }`

Runtime normalization projects successful adapter output into:

- `{ sigil, symbol, selector, body }`

This keeps command/runtime surfaces stable when upstream workbench parser AST schemas evolve.

## Validation

`npm run lint` checks required manifest copy fields for:

1. spw-form shape (`isLikelySpwForm`)
2. successful parse (`parseSpwForm`)

If copy is not executable, lint fails.
