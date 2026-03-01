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

## Practical Debug Loop

1. Open the home route.
2. Trigger click-stage progression.
3. Inspect `spw-ecology-map` and verify lifecycle counters increase.
4. Inspect `window.__SPW_APP__.ecology.getSnapshot()` in DevTools.

This creates a transparent feedback loop for component health during iterative feature work.
