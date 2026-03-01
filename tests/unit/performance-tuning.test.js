import test from 'node:test';
import assert from 'node:assert/strict';

import { installPerformanceTuning } from '../../src/core/runtime/js/performance-tuning.js';

function createMetaNode(content) {
  return {
    getAttribute(name) {
      return name === 'content' ? content : null;
    }
  };
}

function createToggleNode() {
  const attrs = new Map();
  return {
    textContent: '',
    setAttribute(name, value) {
      attrs.set(name, String(value));
    },
    getAttribute(name) {
      return attrs.get(name) ?? null;
    },
    closest(selector) {
      if (selector === '[data-role="performance-toggle"]') {
        return this;
      }
      return null;
    }
  };
}

function createDocumentStub(textureOrigin = 'https://tealstripesvibes.com') {
  const rootStyle = new Map();
  const listeners = new Map();
  const toggle = createToggleNode();

  const documentRef = {
    documentElement: {
      dataset: {},
      style: {
        setProperty(name, value) {
          rootStyle.set(name, String(value));
        },
        getPropertyValue(name) {
          return rootStyle.get(name) ?? '';
        }
      }
    },
    querySelector(selector) {
      if (selector === 'meta[name="spw:texture-cache-origin"]') {
        return createMetaNode(textureOrigin);
      }

      return null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-role="performance-toggle"]') {
        return [toggle];
      }

      return [];
    },
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    removeEventListener(name) {
      listeners.delete(name);
    },
    __dispatchClick(target) {
      const listener = listeners.get('click');
      listener?.({ target });
    }
  };

  return { documentRef, toggle };
}

function createWindowStub() {
  const storage = new Map();

  return {
    location: { href: 'https://spwashi.click/' },
    navigator: { hardwareConcurrency: 8 },
    localStorage: {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      }
    },
    async fetch() {
      return {
        ok: true,
        async json() {
          return {
            profiles: {
              field: { textureGain: 0.65, frameRate: 24 }
            }
          };
        }
      };
    }
  };
}

test('performance tuning installs profile + texture origin metadata', () => {
  const { documentRef, toggle } = createDocumentStub();
  const windowRef = createWindowStub();

  const controller = installPerformanceTuning(documentRef, windowRef, { reducedMotion: false });

  assert.equal(documentRef.documentElement.dataset.performanceProfile, 'field');
  assert.equal(documentRef.documentElement.dataset.textureCacheOrigin, 'https://tealstripesvibes.com');
  assert.match(toggle.textContent, /^\^perf\{ profile: field tuner: idle \}$/);

  controller.destroy();
});

test('performance tuning cycles profile and loads texture tuner overrides', async () => {
  const { documentRef } = createDocumentStub();
  const windowRef = createWindowStub();

  const controller = installPerformanceTuning(documentRef, windowRef, { reducedMotion: false });
  documentRef.__dispatchClick(createToggleNode());

  assert.equal(controller.getProfile(), 'maximal');

  const tunerState = await controller.loadTextureTuner({ assetVersion: '20260228-arc-vibe-r1' });
  assert.equal(tunerState.state, 'ready');
  assert.equal(documentRef.documentElement.dataset.textureTunerState, 'ready');

  controller.setProfile('field');
  assert.equal(controller.getConfig().textureGain, 0.65);
  assert.equal(controller.getConfig().frameRate, 24);

  controller.destroy();
});
