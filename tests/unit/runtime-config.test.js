import test from 'node:test';
import assert from 'node:assert/strict';

import { readRuntimeConfig, resolveRuntimeAssetUrl } from '../../src/core/runtime/js/runtime-config.js';

test('readRuntimeConfig normalizes embed mode and base url defaults', () => {
  const config = readRuntimeConfig({
    documentRef: {
      documentElement: { dataset: {} },
      querySelector() {
        return null;
      }
    },
    overrides: {}
  });

  assert.equal(config.embedMode, 'standalone');
  assert.equal(config.baseUrl, '/');
  assert.equal(config.enableServiceWorker, true);
  assert.equal(config.hostId, 'spwashi.click');
  assert.equal(config.hostVersion, '');
  assert.equal(config.hostManifestPath, '');
  assert.equal(config.hostManifestRequired, false);
  assert.equal(config.hostEnhancementManifestPath, '');
  assert.equal(config.viewportMode, 'adaptive');
  assert.equal(config.spaceMode, 'adaptive');
  assert.equal(config.mobileBreakpoint, 900);
  assert.equal(config.compactBreakpoint, 640);
});

test('readRuntimeConfig respects embedded overrides and disables service worker by default', () => {
  const config = readRuntimeConfig({
    documentRef: {
      documentElement: { dataset: {} },
      querySelector() {
        return null;
      }
    },
    overrides: {
      embedMode: 'embedded',
      baseUrl: '/vendor/spwashi.click/'
    }
  });

  assert.equal(config.embedMode, 'embedded');
  assert.equal(config.baseUrl, '/vendor/spwashi.click/');
  assert.equal(config.enableServiceWorker, false);
  assert.equal(config.hostId, 'spwashi.click');
  assert.equal(config.hostVersion, '');
  assert.equal(config.hostManifestPath, '');
  assert.equal(config.hostManifestRequired, false);
  assert.equal(config.hostEnhancementManifestPath, '');
  assert.equal(config.viewportMode, 'adaptive');
  assert.equal(config.spaceMode, 'adaptive');
  assert.equal(config.mobileBreakpoint, 900);
  assert.equal(config.compactBreakpoint, 640);
});

test('readRuntimeConfig accepts host identity from overrides and meta tags', () => {
  const metaValues = new Map([
    ['spw:host-id', 'lore.land'],
    ['spw:host-version', '2026.03.01']
  ]);

  const config = readRuntimeConfig({
    documentRef: {
      documentElement: { dataset: {} },
      querySelector(selector) {
        const nameMatch = selector.match(/meta\[name="([^"]+)"\]/);
        const metaName = nameMatch?.[1] ?? '';
        if (!metaValues.has(metaName)) {
          return null;
        }

        return {
          getAttribute(attributeName) {
            if (attributeName !== 'content') {
              return null;
            }
            return metaValues.get(metaName);
          }
        };
      }
    },
    overrides: {
      hostId: 'spwashi.work',
      hostVersion: 'r7'
    }
  });

  const metaConfig = readRuntimeConfig({
    documentRef: {
      documentElement: { dataset: {} },
      querySelector(selector) {
        const nameMatch = selector.match(/meta\[name="([^"]+)"\]/);
        const metaName = nameMatch?.[1] ?? '';
        if (!metaValues.has(metaName)) {
          return null;
        }

        return {
          getAttribute(attributeName) {
            if (attributeName !== 'content') {
              return null;
            }
            return metaValues.get(metaName);
          }
        };
      }
    },
    overrides: {}
  });

  assert.equal(config.hostId, 'spwashi.work');
  assert.equal(config.hostVersion, 'r7');
  assert.equal(metaConfig.hostId, 'lore.land');
  assert.equal(metaConfig.hostVersion, '2026.03.01');

  const hostMetaValues = new Map([
    ['spw:host-manifest', '/seed/hosts/lore.manifest.json'],
    ['spw:host-manifest-required', 'true'],
    ['spw:host-enhancements-manifest', '/seed/hosts/lore.enhancements.json']
  ]);
  const hostMetaConfig = readRuntimeConfig({
    documentRef: {
      documentElement: { dataset: {} },
      querySelector(selector) {
        const nameMatch = selector.match(/meta\[name="([^"]+)"\]/);
        const metaName = nameMatch?.[1] ?? '';
        if (!hostMetaValues.has(metaName)) {
          return null;
        }

        return {
          getAttribute(attributeName) {
            if (attributeName !== 'content') {
              return null;
            }
            return hostMetaValues.get(metaName);
          }
        };
      }
    },
    overrides: {}
  });

  assert.equal(hostMetaConfig.hostManifestPath, '/seed/hosts/lore.manifest.json');
  assert.equal(hostMetaConfig.hostManifestRequired, true);
  assert.equal(hostMetaConfig.hostEnhancementManifestPath, '/seed/hosts/lore.enhancements.json');
});

test('readRuntimeConfig accepts viewport controls from overrides and meta tags', () => {
  const metaValues = new Map([
    ['spw:viewport-mode', 'fixed'],
    ['spw:space-mode', 'expansive'],
    ['spw:mobile-breakpoint', '960'],
    ['spw:compact-breakpoint', '700']
  ]);

  const fromMeta = readRuntimeConfig({
    documentRef: {
      documentElement: { dataset: {} },
      querySelector(selector) {
        const nameMatch = selector.match(/meta\[name="([^"]+)"\]/);
        const metaName = nameMatch?.[1] ?? '';
        if (!metaValues.has(metaName)) {
          return null;
        }

        return {
          getAttribute(attributeName) {
            if (attributeName !== 'content') {
              return null;
            }
            return metaValues.get(metaName);
          }
        };
      }
    },
    overrides: {}
  });

  const fromOverrides = readRuntimeConfig({
    documentRef: {
      documentElement: { dataset: {} },
      querySelector() {
        return null;
      }
    },
    overrides: {
      viewportMode: 'fixed',
      spaceMode: 'compact',
      mobileBreakpoint: 1024,
      compactBreakpoint: 720
    }
  });

  assert.equal(fromMeta.viewportMode, 'fixed');
  assert.equal(fromMeta.spaceMode, 'expansive');
  assert.equal(fromMeta.mobileBreakpoint, 960);
  assert.equal(fromMeta.compactBreakpoint, 700);

  assert.equal(fromOverrides.viewportMode, 'fixed');
  assert.equal(fromOverrides.spaceMode, 'compact');
  assert.equal(fromOverrides.mobileBreakpoint, 1024);
  assert.equal(fromOverrides.compactBreakpoint, 720);
});

test('resolveRuntimeAssetUrl rewrites root assets against embedded base url and appends release version', () => {
  const url = resolveRuntimeAssetUrl('/src/core/runtime/js/boot.js', {
    baseUrl: '/vendor/spwashi.click/'
  }, {
    assetVersion: '20260228-r1'
  });

  assert.equal(url, '/vendor/spwashi.click/src/core/runtime/js/boot.js?v=20260228-r1');
});

test('resolveRuntimeAssetUrl preserves external urls and appends release version', () => {
  const url = resolveRuntimeAssetUrl(
    'https://tealstripesvibes.com/spw-cache/texture-tuner.v1.json',
    { baseUrl: '/' },
    { assetVersion: '20260228-r1' }
  );

  assert.equal(
    url,
    'https://tealstripesvibes.com/spw-cache/texture-tuner.v1.json?v=20260228-r1'
  );
});
