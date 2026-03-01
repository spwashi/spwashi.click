import test from 'node:test';
import assert from 'node:assert/strict';

import { createFallbackHostManifest, loadHostManifest } from '../../src/core/host-manifest.js';

test('createFallbackHostManifest yields deterministic defaults', () => {
  const manifest = createFallbackHostManifest(
    { hostId: 'spwashi.work', hostVersion: 'r7' },
    'host-manifest-disabled'
  );

  assert.equal(manifest.reason, 'host-manifest-disabled');
  assert.equal(manifest.host.id, 'spwashi.work');
  assert.equal(manifest.host.version, 'r7');
  assert.equal(manifest.api.compatible, true);
});

test('loadHostManifest marks required missing manifests as incompatible', async () => {
  const manifest = await loadHostManifest({
    runtimeConfig: {
      hostId: 'lore.land',
      hostVersion: '2026.03.01',
      hostManifestPath: '',
      hostManifestRequired: true
    },
    fetchImpl: null
  });

  assert.equal(manifest.reason, 'host-manifest-required-missing-path');
  assert.equal(manifest.api.compatible, false);
});

test('loadHostManifest normalizes host overlays for ecology and theming', async () => {
  const fakeFetch = async () => ({
    ok: true,
    async json() {
      return {
        version: '1',
        host: { id: 'lore.land', version: '2026.03.01' },
        api: { minRuntimeApi: '1.0.0', maxRuntimeApi: '2.0.0' },
        ecology: {
          species: [
            {
              tagName: 'spw-lore-card',
              role: 'host-widget',
              dependsOn: ['spw-site-shell'],
              emits: ['spw:navigate']
            }
          ]
        },
        enhancements: {
          manifestPath: '/seed/hosts/lore.enhancements.json',
          prepend: true
        },
        theming: {
          baseTokens: { color_accent: '#00ffaa' },
          combinations: [
            {
              id: 'mobile',
              routes: ['home'],
              media: { maxWidth: 720 },
              tokens: { '--color-accent': '#ff6600' }
            }
          ]
        },
        interfaces: {
          compose: ['core', 'integration'],
          required: ['theming']
        }
      };
    }
  });

  const manifest = await loadHostManifest({
    runtimeConfig: {
      hostId: 'spwashi.work',
      hostVersion: 'r7',
      hostManifestPath: '/seed/hosts/lore.manifest.json'
    },
    fetchImpl: fakeFetch,
    assetVersion: '20260301-r2'
  });

  assert.equal(manifest.reason, 'ok');
  assert.equal(manifest.host.id, 'lore.land');
  assert.equal(manifest.api.compatible, true);
  assert.equal(manifest.ecology.species.length, 1);
  assert.equal(manifest.enhancements.prepend, true);
  assert.equal(manifest.theming.baseTokens['--color_accent'], '#00ffaa');
  assert.equal(manifest.theming.combinations[0].id, 'mobile');
  assert.equal(manifest.interfaces.required[0], 'theming');
});
