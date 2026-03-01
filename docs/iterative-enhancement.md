# Iterative Enhancement

Baseline pages render statically. Optional enhancements load from `seed/site/` after core boot.

## Loader Contract

- Loader: `src/core/runtime/js/iterative-enhancement.js`
- Manifest path: `/seed/site/enhancements.manifest.json`
- Entry module export: `installEnhancement(context)`
- Release-aware cache busting is applied automatically to manifest fetches and enhancement module imports.
- Optional host overlay manifest path: `runtimeConfig.hostEnhancementManifestPath`

Enhancement failures are isolated and reported as events:

- `spw:enhancement:loaded`
- `spw:enhancement:failed`
- `spw:enhancement:gated` (incompatible runtime API/host/interface windows)

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
      "hosts": ["spwashi.work", "lore.land"],
      "minRuntimeApi": "1.1.0",
      "maxRuntimeApi": "2.0.0",
      "requiredInterfaces": ["theming", "host"],
      "module": "/seed/site/enhancements/seed-atlas.js",
      "target": "[data-role='seed-atlas']"
    }
  ]
}
```

## Current Seed Example

`seed/site/enhancements/seed-atlas.js` reads your `seed/images/2026-02-28/*.webp` set and rotates imagery by click count + phase.
It also emits interaction-literacy prompts so abstract visuals teach state intuition (cause/effect, phase progression, and feedback clarity).
Atlas thumbnails are keyboard navigable (`ArrowLeft/ArrowRight/Home/End`) and use sporadic local size sampling to tune strip density across view sizes.
Core syntax controls can additionally project page-level layout/component modes via:

- `data-spw-layout-view`
- `data-spw-component-view`

Enhancements can consume these datasets to align their own rendering with brace/operator navigation.

## Waypoint Loop

1. Add or adjust an enhancement entry in the manifest.
2. Add/update module logic in `seed/site/enhancements/`.
3. Reload route and validate:
   - baseline still works if the module is removed
   - enhancement activates when present
4. Promote stable enhancement ideas into `src/` only when they become core behavior.
