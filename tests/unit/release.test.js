import test from 'node:test';
import assert from 'node:assert/strict';

import { appendAssetVersion, readReleaseMeta } from '../../src/core/runtime/js/release.js';

function createMeta(content) {
  return {
    getAttribute(name) {
      return name === 'content' ? content : null;
    }
  };
}

function createDocumentStub(metaMap) {
  return {
    querySelector(selector) {
      return metaMap[selector] ?? null;
    }
  };
}

test('appendAssetVersion preserves existing query parameters', () => {
  assert.equal(
    appendAssetVersion('/src/core/runtime/js/boot.js', '20260228-genesis-chorus-mathematical-jazz-r1'),
    '/src/core/runtime/js/boot.js?v=20260228-genesis-chorus-mathematical-jazz-r1'
  );
  assert.equal(
    appendAssetVersion('/seed/site/enhancements.manifest.json?draft=true', '20260228-genesis-chorus-mathematical-jazz-r1'),
    '/seed/site/enhancements.manifest.json?draft=true&v=20260228-genesis-chorus-mathematical-jazz-r1'
  );
});

test('readReleaseMeta reads release tags and computes fallback asset versions', () => {
  const metaDoc = createDocumentStub({
    'meta[name="spw:release-date"]': createMeta('2026-03-01'),
    'meta[name="spw:release-id"]': createMeta('r2'),
    'meta[name="spw:release-arc"]': createMeta('city-crystal'),
    'meta[name="spw:release-vibe"]': createMeta('night-runway'),
    'meta[name="spw:asset-version"]': createMeta('20260301-city-crystal-night-runway-r2')
  });

  const releaseMeta = readReleaseMeta(metaDoc);
  assert.equal(releaseMeta.releaseDate, '2026-03-01');
  assert.equal(releaseMeta.releaseId, 'r2');
  assert.equal(releaseMeta.releaseArc, 'city-crystal');
  assert.equal(releaseMeta.releaseVibe, 'night-runway');
  assert.equal(releaseMeta.assetVersion, '20260301-city-crystal-night-runway-r2');
});
