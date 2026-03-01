# Web Component Ecology

The component layer is modeled as a small ecology with explicit roles.

## Species

- `spw-site-shell`: habitat and route context
- `spw-click-stage`: primary interactive performer
- `spw-rhythm-grid`: metronome and intensity visualizer
- `spw-chapter-panel`: narrative gatekeeper
- `spw-ecology-map`: observer and reporter
- `spw-shader-field`: harmonic field renderer and interaction injector
- `spw-syntax-lab`: symbolic navigator and layout/component mode projector

## Ecology Ledger

`src/core/ecology.js` maintains a snapshot with:

- Current route and phase
- Species lifecycle counters (`connected`, `disconnected`, `rendered`, `intent`)
- Last lifecycle note per species

## Event Surface

Ecology updates emit `spw:ecology:changed` with previous and next snapshots.

## Symbol-Driven Views

`spw-syntax-lab` now treats braces and operators as navigation and view controls:

- Brace swaps select layout view and movement style:
  - `{}` => `flow`
  - `[]` => `grid`
  - `()` => `focus`
  - `<>` => `stack`
- Operator swaps/rotations select component render view via operator index:
  - `native`, `wire`, `lumen`, `quiet`

The component writes global runtime flags on `<html>`:

- `data-spw-layout-view`
- `data-spw-component-view`

This means symbolic navigation is not isolated to the lab; it can reframe page layout and component presentation coherently.

## Medium Flow

`src/core/medium-flow.js` installs an optional cadence controller:

- Treats `[data-layout-region]` sections as facets in a continuous medium.
- Advances click-phase state over time (`medium:auto`) to keep composition moving.
- Uses keyboard controls as language controls (`ArrowUp/ArrowDown`, `Space`, `ArrowRight`, `Home`).

The console overlay is descriptive, not decorative; it exposes current facet, phase, and cadence reason in Spw form.

## Runtime Command Surface

`src/core/spw-command-surface.js` maps compact Spw forms into runtime API calls:

- `!top{ ... }` -> top-level state/perf/structure
- `!region{ ... }` -> selector-scoped attribute/data/style/text tuning
- `!component{ ... }` -> component-level tuning
- `!vars{ ... }` -> CSS variable writes
- `!reset{ ... }`, `!rebind{}`, `!catalog{ ... }`

Use through runtime control:

- `window.__SPW_RUNTIME__.evalSpw(form)`
- `window.__SPW_RUNTIME__.run('spw', { expression: form })`

## Space-Aware Behavior

`src/core/space-metrics.js` provides a sporadic sampler used by interactive components/enhancements.

- Components project local geometry as `data-inline-band`, `data-block-band`, `data-area-band`.
- Components also expose CSS vars (`--stage-inline-size`, `--syntax-inline-size`, `--atlas-inline-size`) so style can respond without tight JS loops.
- Sampling is low-frequency + resize-observer-backed to keep perf stable while still adapting to changing layout real estate.

## Practical Debug Loop

1. Open the home route.
2. Trigger click-stage progression.
3. Inspect `spw-ecology-map` and verify lifecycle counters increase.
4. Inspect `window.__SPW_APP__.ecology.getSnapshot()` in DevTools.

This creates a transparent feedback loop for component health during iterative feature work.
