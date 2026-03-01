import test from 'node:test';
import assert from 'node:assert/strict';

import { readRuntimeConfig, resolveRuntimeAssetUrl } from '../../src/core/runtime-config.js';

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
});

test('resolveRuntimeAssetUrl rewrites root assets against embedded base url and appends release version', () => {
  const url = resolveRuntimeAssetUrl('/src/core/boot.js', {
    baseUrl: '/vendor/spwashi.click/'
  }, {
    assetVersion: '20260228-r1'
  });

  assert.equal(url, '/vendor/spwashi.click/src/core/boot.js?v=20260228-r1');
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
