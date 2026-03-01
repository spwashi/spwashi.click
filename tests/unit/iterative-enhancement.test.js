import test from 'node:test';
import assert from 'node:assert/strict';

import { loadEnhancementManifest } from '../../src/core/iterative-enhancement.js';

test('loadEnhancementManifest falls back when fetch is unavailable', async () => {
  const manifest = await loadEnhancementManifest({ fetchImpl: null });

  assert.equal(manifest.profile, 'baseline');
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
  assert.equal(manifest.enhancements.length, 1);
  assert.equal(manifest.enhancements[0].id, 'one');
});
