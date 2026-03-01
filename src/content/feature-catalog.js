/**
 * ^intent:
 * ^intent[module]{ id:content.feature-catalog mode:spwlang surface:web }
 * ^invariants:
 * ^invariant[form]{ determinism:locked contracts:explicit sidefx:bounded }
 * ^invariant[state]{ mutation:public-api projection:data+aria }
 * ^compose:
 * ^compose[neighbors]{ ingress:imports egress:exports bridge:event+store }
 */

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
      files: Object.freeze(['src/components/click-stage.js', 'src/core/store.js', 'src/core/motion.js'])
    }),
    Object.freeze({
      id: 'shader-field',
      route: 'home',
      spw: '^feature[shader-field]{ input:pointer+keyboard output:harmonics+intent-click profile-aware:true }',
      files: Object.freeze([
        'src/components/shader-field.js',
        'src/core/space-metrics.js',
        'src/styles/components.css'
      ])
    }),
    Object.freeze({
      id: 'syntax-lab',
      route: 'home',
      spw: '^feature[syntax-lab]{ braces:layout-view operators:component-view nodes:facet-nav }',
      files: Object.freeze(['src/components/syntax-lab.js', 'src/core/spwlang-parser.js'])
    }),
    Object.freeze({
      id: 'seed-atlas',
      route: 'home|notes',
      spw: '^feature[seed-atlas]{ source:seed-manifest behavior:thumb+keyboard+phase-lighting }',
      files: Object.freeze(['seed/site/enhancements/seed-atlas.js', 'src/core/iterative-enhancement.js'])
    }),
    Object.freeze({
      id: 'runtime-control',
      route: 'global',
      spw: '^feature[runtime-control]{ target:llm methods:evalSpw+setTopLevel+setRegion+rebind }',
      files: Object.freeze([
        'src/core/runtime-control.js',
        'src/core/spw-command-surface.js',
        'src/core/boot.js'
      ])
    }),
    Object.freeze({
      id: 'structure-mode',
      route: 'global',
      spw: '^feature[structure-mode]{ toggle:data-llm-readable-structure projection:aria-description }',
      files: Object.freeze(['src/core/structure-mode.js', 'src/components/syntax-lab.js'])
    }),
    Object.freeze({
      id: 'pwa-support',
      route: 'global',
      spw: '^feature[pwa]{ install:manifest+sw state:online|offline|ready release-cache:date-arc-vibe }',
      files: Object.freeze([
        'src/core/pwa.js',
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
        'src/core/medium-flow.js',
        'src/core/runtime.js',
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
