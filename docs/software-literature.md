# Software Literature

This project treats source code as readable prose with executable invariants.

## Reading Order

1. `src/core/boot.js`
2. `src/core/store.js`
3. `src/core/motion.js`
4. `src/core/ecology.js`
5. `src/components/`
6. `src/pages/`

This order mirrors the workbench-style architecture discipline from `seed/extern/spw-workbench`: deterministic inner layers first, composition layers second, optional enhancement layers last.

## Module Contract

Every module under `src/` starts with three headings:

- `Intent:`
- `Invariants:`
- `How this composes with neighbors:`

The contract is enforced by `scripts/lint.js`.

## Marginalia Ledger

Runtime annotations are written to an in-memory marginalia ledger (`src/core/literature.js`) so transitions can be inspected as narrative, not just events.

- `window.__SPW_APP__.marginalia.read()` exposes the latest lines.
- `data-marginalia-lines` on `<html>` reflects current line count.

## LLM-Readable Structure Mode

- Components and sections can declare `data-structure-label`.
- The footer setting `Structure Labels: On/Off` applies `aria-description` annotations at runtime.
- Default remains visually quiet; the mode exists for machine/screen-reader interpretability when needed.

## Philosophy Bridge

Inspired by the workbench's layered maps and waypoints, this site keeps:

- Portable core logic
- Observable ecology
- Optional outer-layer enhancements

That keeps experimentation fast without collapsing baseline integrity.
