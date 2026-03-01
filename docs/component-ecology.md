# Web Component Ecology

The component layer is modeled as a small ecology with explicit roles.

## Species

- `spw-site-shell`: habitat and route context
- `spw-click-stage`: primary interactive performer
- `spw-rhythm-grid`: metronome and intensity visualizer
- `spw-chapter-panel`: narrative gatekeeper
- `spw-ecology-map`: observer and reporter

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

## Practical Debug Loop

1. Open the home route.
2. Trigger click-stage progression.
3. Inspect `spw-ecology-map` and verify lifecycle counters increase.
4. Inspect `window.__SPW_APP__.ecology.getSnapshot()` in DevTools.

This creates a transparent feedback loop for component health during iterative feature work.
