import test from 'node:test';
import assert from 'node:assert/strict';

import { loadEnhancementManifest } from '../../src/core/runtime/js/iterative-enhancement.js';

test('loadEnhancementManifest falls back when fetch is unavailable', async () => {
  const manifest = await loadEnhancementManifest({ fetchImpl: null });

  assert.equal(manifest.profile, 'baseline');
  assert.equal(manifest.reason, 'fetch-unavailable');
  assert.deepEqual(manifest.enhancements, []);
});

test('loadEnhancementManifest normalizes manifest payload', async () => {
  const fakeFetch = async () => ({
    ok: true,
    async json() {
      return {
        version: '2',
        profile: 'seeded',
        enhancements: [
          { id: 'one', module: '/seed/one.js' },
          null,
          'bad'
        ]
      };
    }
  });

  const manifest = await loadEnhancementManifest({ fetchImpl: fakeFetch });

  assert.equal(manifest.version, '2');
  assert.equal(manifest.profile, 'seeded');
  assert.equal(manifest.reason, 'ok');
  assert.equal(manifest.enhancements.length, 1);
  assert.equal(manifest.enhancements[0].id, 'one');
  assert.equal(manifest.enhancements[0].module, '/seed/one.js');
});

test('loadEnhancementManifest normalizes host and compatibility gating fields', async () => {
  const fakeFetch = async () => ({
    ok: true,
    async json() {
      return {
        version: '3',
        profile: 'host-overlay',
        enhancements: [
          {
            id: 'host-only',
            module: '/seed/hosts/lore/theme.js',
            hosts: ['lore.land'],
            routes: ['home', 'notes'],
            requiredInterfaces: ['theming', 'host'],
            interfaceVersions: {
              theming: '1.0.0'
            },
            minRuntimeApi: '1.1.0',
            maxRuntimeApi: '2.0.0'
          }
        ]
      };
    }
  });

  const manifest = await loadEnhancementManifest({ fetchImpl: fakeFetch });
  assert.equal(manifest.profile, 'host-overlay');
  assert.equal(manifest.enhancements[0].hosts[0], 'lore.land');
  assert.equal(manifest.enhancements[0].requiredInterfaces[0], 'theming');
  assert.equal(manifest.enhancements[0].interfaceVersions.theming, '1.0.0');
  assert.equal(manifest.enhancements[0].minRuntimeApi, '1.1.0');
  assert.equal(manifest.enhancements[0].maxRuntimeApi, '2.0.0');
});
