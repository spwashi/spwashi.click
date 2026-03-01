# Iterative Enhancement

Baseline pages render statically. Optional enhancements load from `seed/site/` after core boot.

## Loader Contract

- Loader: `src/core/iterative-enhancement.js`
- Manifest path: `/seed/site/enhancements.manifest.json`
- Entry module export: `installEnhancement(context)`
- Release-aware cache busting is applied automatically to manifest fetches and enhancement module imports.

Enhancement failures are isolated and reported as events:

- `spw:enhancement:loaded`
- `spw:enhancement:failed`

## Manifest Shape

```json
{
  "version": "1.0",
  "profile": "lore-land-seed",
  "enhancements": [
    {
      "id": "seed-atlas",
      "enabled": true,
      "routes": ["home", "notes"],
      "module": "/seed/site/enhancements/seed-atlas.js",
      "target": "[data-role='seed-atlas']"
    }
  ]
}
```

## Current Seed Example

`seed/site/enhancements/seed-atlas.js` reads your `seed/images/2026-02-28/*.png` set and rotates imagery by click count + phase.
It also emits interaction-literacy prompts so abstract visuals teach state intuition (cause/effect, phase progression, and feedback clarity).

## Waypoint Loop

1. Add or adjust an enhancement entry in the manifest.
2. Add/update module logic in `seed/site/enhancements/`.
3. Reload route and validate:
   - baseline still works if the module is removed
   - enhancement activates when present
4. Promote stable enhancement ideas into `src/` only when they become core behavior.
