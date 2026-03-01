# Spwlang Parser Bridge

This site treats key copy strings as executable forms.

## Runtime Path

- Core bridge: `src/core/spwlang-parser.js`
- Optional adapter module: `seed/site/enhancements/workbench-parser-adapter.js`

Boot sequence attempts adapter load first. If unavailable, fallback parser handles the supported sigil-form subset.

## Why This Exists

- Keep UI language aligned with the `seed/extern/spw-workbench` north star.
- Ensure copy can be parsed, not only read.
- Preserve deterministic behavior even when external parser artifacts are absent.

## Adapter Contract

`workbench-parser-adapter.js` should export one of:

- `parseSpwForm(input)`
- `parse(input)`
- default function

Return shape accepted:

- `{ ok: boolean, ast?: object, reason?: string }`
- `{ success: boolean, ast?: object, value?: object, error?: string }`

## Validation

`npm run lint` checks required manifest copy fields for:

1. spw-form shape (`isLikelySpwForm`)
2. successful parse (`parseSpwForm`)

If copy is not executable, lint fails.
