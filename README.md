# spwashi.click

Static multi-page website built with vanilla ES modules, Web Components, and CSS cascade layers.

## Architecture

- Routes: `/`, `/work/`, `/notes/`, `404.html`
- Entry point: `src/core/boot.js`
- State model: immutable app store in `src/core/store.js`
- Ecology model: lifecycle ledger in `src/core/ecology.js`
- Iterative enhancement loader: `src/core/iterative-enhancement.js`
- Software literature marginalia: `src/core/literature.js`
- Interaction contracts: typed custom events in `src/core/events.js`
- Components:
  - `spw-site-shell`
  - `spw-click-stage`
  - `spw-chapter-panel`
  - `spw-rhythm-grid` (SVG-driven)
  - `spw-ecology-map`
- Content manifests: `src/content/manifests.js`
- Styles: token-first cascade layers in `src/styles/`

## Development

```bash
npm install
npm run check
```

If this is a fresh clone, initialize submodules first:

```bash
git submodule update --init --recursive
```

### Scripts

- `npm run lint`: checks source modules for code-as-literature headers and named exports only.
- `npm run test`: runs unit and static e2e scenario tests.
- `npm run build`: outputs deployable static artifacts into `dist/`.

## Deploy

- CI workflow validates lint and tests on push/PR.
- Pages workflow builds static artifacts and deploys `dist/` to GitHub Pages.
- `CNAME` is set to `spwashi.click`.

## Code as Literature Convention

Every source module under `src/` starts with:

- `Intent:`
- `Invariants:`
- `How this composes with neighbors:`

This keeps behavior contracts explicit and reviewable.

## Software Literature and Waypoints

- `docs/software-literature.md`
- `docs/component-ecology.md`
- `docs/iterative-enhancement.md`
- `docs/spwlang-parser-bridge.md`
- `docs/llm-crawler-contract.md`

These docs intentionally mirror the layered, waypointed thinking found in `seed/extern/spw-workbench` while keeping this repository independently shippable.

## Crawler + Spw Index

Crawler-visible index surfaces:

- `spw.index.json`
- `spw.index.spw`
- `.spw/workspace.spw`

Runtime exposure:

- `window.__SPW_RUNTIME__.getCatalog()`
- `window.__SPW_RUNTIME__.run('catalog', { summaryOnly: true })`
- `window.__SPW_RUNTIME__.evalSpw('!top{ route:notes clicks:8 profile:maximal llm:true }')`

## Release and Cache Policy

- Release metadata lives in `release.manifest.json`.
- HTML assets are release-stamped with date + arc + vibe versions (`__ASSET_VERSION__` placeholders filled during `npm run build`).
- Seed enhancements and seed images receive runtime cache-busting using the same release asset version.
- Override stamps in CI with:
  - `RELEASE_DATE=YYYY-MM-DD`
  - `RELEASE_ID=rN`
  - `RELEASE_ARC=arc-name`
  - `RELEASE_VIBE=vibe-name`
  - `ASSET_VERSION=custom-tag`

## LLM-Readable Structure Mode

- Toggle in any footer via `Structure Labels: On/Off`.
- When enabled, elements with `data-structure-label` receive `aria-description` annotations.
- This adds machine-readable component structure with minimal visual noise.

## Runtime Control API

- Global API: `window.__SPW_RUNTIME__` (alias: `window.spwRuntime`).
- Supports:
  - Spw command execution (`evalSpw`, `run('spw', { expression })`)
  - top-level state control (`setTopLevel`)
  - region/component parameter control (`setRegion`, `setComponent`)
  - CSS variable/window tuning (`setWindowVars`)
  - runtime lifecycle controls (`resetRuntime`, `rebindRuntime`, `run`)
- Installed in `src/core/runtime-control.js` during boot.

## Spw Copy Parsing

- Copy strings can be authored as executable spw-like forms (e.g. `^identity[spwashi]{ physics: spw }`).
- Runtime parser bridge: `src/core/spwlang-parser.js`.
- Optional adapter path: `seed/site/enhancements/workbench-parser-adapter.js`.

## Texture Cache + Tuner

- Texture origin is declared per page via `meta[name=\"spw:texture-cache-origin\"]`.
- Default origin: `https://tealstripesvibes.com`.
- Performance controller attempts to load optional profile overrides from:
  - `https://tealstripesvibes.com/spw-cache/texture-tuner.v1.json`
- State reflected on `<html>`:
  - `data-performance-profile`
  - `data-texture-tuner-state`
  - `data-texture-cache-origin`
