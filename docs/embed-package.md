# Embed As Package

`spwashi.click` can run in three explicit runtime modes:

- `standalone`: default website behavior, auto-mount enabled, service worker enabled.
- `embedded`: host controls mount timing and base URL, service worker disabled by default.
- `assets-only`: no runtime mount, only contracts/styles/assets consumption.

## Runtime Entry

Import from:

- `src/runtime/index.js` (source path)
- package export: `spwashi-click/runtime` when installed as a dependency

Example:

```js
import { mountSpwRuntime } from 'spwashi-click/runtime';

await mountSpwRuntime({
  embedMode: 'embedded',
  baseUrl: '/vendor/spwashi.click/',
  enableServiceWorker: false,
  autoMount: false,
  hostId: 'spwashi.work',
  hostVersion: 'r7',
  hostManifestPath: '/seed/hosts/spwashi.work.manifest.json',
  hostManifestRequired: true,
  hostEnhancementManifestPath: '/seed/hosts/spwashi.work.enhancements.json'
});
```

## HTML Meta Controls

These are read by `src/core/runtime/js/runtime-config.js`:

- `spw:embed-mode` -> `standalone|embedded|assets-only`
- `spw:base-url` -> asset root prefix for parser/enhancement/PWA URLs
- `spw:sw-enabled` -> `true|false`
- `spw:auto-mount` -> `true|false`
- `spw:host-id` -> consuming host id (`spwashi.work`, `lore.land`, etc.)
- `spw:host-version` -> optional host release/version string
- `spw:host-manifest` -> host overlay manifest path
- `spw:host-manifest-required` -> `true|false` compatibility guard for required host overlays
- `spw:host-enhancements-manifest` -> host enhancement manifest overlay path

## Host Manifest Overlay

Host manifests can provide:

- API compatibility window (`minRuntimeApi`, `maxRuntimeApi`)
- ecology species extensions
- host-responsive theme combinatorics (route/phase/media aware token overlays)
- composable interface requirements and defaults
- host enhancement manifest location + prepend/append mode

At runtime, hosts can inspect compatibility and active overlays via:

- `window.__SPW_RUNTIME__.getIntegrationStatus()`
- `window.__SPW_RUNTIME__.run('contract')`
- `window.__SPW_RUNTIME__.run('hostManifest')`
- `window.__SPW_RUNTIME__.run('theme')`

## Assets Manifest

`assets.manifest.json` is release-stamped during build and lists:

- runtime entry files
- style files
- contract files
- optional seed enhancement assets

This is the canonical machine-readable handoff for host repos.

## Export For Submodule Hosts

Use:

```bash
npm run export:assets -- --target ../host/public/vendor/spwashi.click --mode copy --clean --consumer spwashi.work --consumer-version r7
```

Modes:

- `copy`: materialize files in target directory.
- `symlink`: link files/directories into target for local development.

The exporter writes `spw-export.manifest.json` into the target directory.
`spw-export.manifest.json` includes optional `consumer` and `consumerVersion` fields when provided.
