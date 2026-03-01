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

