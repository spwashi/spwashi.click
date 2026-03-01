export const SPW_FEATURE_CATALOG = Object.freeze({
  version: '2026-02-28',
  entrypoints: Object.freeze({
    json: '/spw.index.json',
    spw: '/spw.index.spw',
    workspace: '/.spw/workspace.spw',
    manifest: '/manifest.webmanifest',
    serviceWorker: '/sw.js'
  }),
  features: Object.freeze([
    Object.freeze({
      id: 'click-stage',
      route: 'home',
      spw: '^feature[click-stage]{ input:click|enter|space|arrow-right output:phase+lumen+layers }',
      files: Object.freeze(['src/components/click-stage.js', 'src/core/runtime/js/store.js', 'src/core/runtime/js/motion.js'])
    }),
    Object.freeze({
      id: 'shader-field',
      route: 'home',
      spw: '^feature[shader-field]{ input:pointer+keyboard output:harmonics+intent-click profile-aware:true }',
      files: Object.freeze([
        'src/components/shader-field.js',
        'src/core/runtime/js/space-metrics.js',
        'src/styles/components.css'
      ])
    }),
    Object.freeze({
      id: 'syntax-lab',
      route: 'home',
      spw: '^feature[syntax-lab]{ braces:layout-view operators:component-view nodes:facet-nav }',
      files: Object.freeze(['src/components/syntax-lab.js', 'src/core/runtime/js/spwlang-parser.js'])
    }),
    Object.freeze({
      id: 'seed-atlas',
      route: 'home|notes',
      spw: '^feature[seed-atlas]{ source:seed-manifest behavior:thumb+keyboard+phase-lighting }',
      files: Object.freeze(['seed/site/enhancements/seed-atlas.js', 'src/core/runtime/js/iterative-enhancement.js'])
    }),
    Object.freeze({
      id: 'runtime-control',
      route: 'global',
      spw: '^feature[runtime-control]{ target:llm methods:evalSpw+setTopLevel+setRegion+rebind+contract+ecology }',
      files: Object.freeze([
        'src/core/runtime/js/runtime-control.js',
        'src/core/runtime/js/spw-command-surface.js',
        'src/core/runtime/js/boot.js'
      ])
    }),
    Object.freeze({
      id: 'host-manifest-overlays',
      route: 'global',
      spw: '^feature[host-manifest]{ host:spwashi.work|lore.land overlays:ecology+theme+enhancements api-window:gated }',
      files: Object.freeze([
        'src/core/runtime/js/host-manifest.js',
        'src/core/runtime/js/runtime-config.js',
        'src/core/runtime/js/runtime.js'
      ])
    }),
    Object.freeze({
      id: 'host-theme-combinatorics',
      route: 'global',
      spw: '^feature[host-theme]{ context:host+route+phase+media output:css-token composition event:spw:host:theme:changed }',
      files: Object.freeze([
        'src/core/runtime/js/host-theme.js',
        'src/styles/tokens.css',
        'src/core/runtime/js/events.js'
      ])
    }),
    Object.freeze({
      id: 'runtime-contract',
      route: 'global',
      spw: '^feature[runtime-contract]{ versioned-api runtime+interfaces compose:interfaces compatibility:min|max }',
      files: Object.freeze([
        'src/core/runtime/js/runtime-contract.js',
        'src/runtime/index.js',
        'src/core/runtime/js/iterative-enhancement.js'
      ])
    }),
    Object.freeze({
      id: 'structure-mode',
      route: 'global',
      spw: '^feature[structure-mode]{ toggle:data-llm-readable-structure projection:aria-description }',
      files: Object.freeze(['src/core/runtime/js/structure-mode.js', 'src/components/syntax-lab.js'])
    }),
    Object.freeze({
      id: 'pwa-support',
      route: 'global',
      spw: '^feature[pwa]{ install:manifest+sw state:online|offline|ready release-cache:date-arc-vibe }',
      files: Object.freeze([
        'src/core/runtime/js/pwa.js',
        'sw.js',
        'manifest.webmanifest',
        'scripts/build-static.js'
      ])
    }),
    Object.freeze({
      id: 'medium-flow',
      route: 'global',
      spw: '^feature[medium-flow]{ cadence:autoplay facets:layout-region controls:arrow+space+home }',
      files: Object.freeze([
        'src/core/runtime/js/medium-flow.js',
        'src/core/runtime/js/runtime.js',
        'src/styles/components.css'
      ])
    })
  ])
});

export function summarizeFeatureCatalog() {
  const routes = new Set();
  for (const feature of SPW_FEATURE_CATALOG.features) {
    for (const routeToken of String(feature.route).split('|')) {
      routes.add(routeToken.trim());
    }
  }

  return Object.freeze({
    version: SPW_FEATURE_CATALOG.version,
    featureCount: SPW_FEATURE_CATALOG.features.length,
    routes: Object.freeze(Array.from(routes).sort()),
    entrypoints: SPW_FEATURE_CATALOG.entrypoints
  });
}
