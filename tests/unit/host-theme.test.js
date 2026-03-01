import test from 'node:test';
import assert from 'node:assert/strict';

import { installHostThemeCombinatorics } from '../../src/core/host-theme.js';

function createStoreStub() {
  let state = {
    activeRoute: 'home',
    phase: 'seed'
  };
  const listeners = new Set();

  return {
    getState() {
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setState(nextState) {
      state = { ...state, ...nextState };
      for (const listener of listeners) {
        listener(state);
      }
    }
  };
}

function createDocumentStub() {
  const styleMap = new Map();
  return {
    documentElement: {
      dataset: {},
      style: {
        setProperty(name, value) {
          styleMap.set(name, String(value));
        },
        removeProperty(name) {
          styleMap.delete(name);
        },
        getPropertyValue(name) {
          return styleMap.get(name) ?? '';
        }
      }
    }
  };
}

function createWindowStub() {
  const listeners = new Map();
  return {
    innerWidth: 680,
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    removeEventListener(name) {
      listeners.delete(name);
    },
    dispatchEvent() {
      return true;
    },
    matchMedia() {
      return {
        matches: false,
        addEventListener() {},
        removeEventListener() {}
      };
    }
  };
}

test('installHostThemeCombinatorics composes base and responsive rule tokens', () => {
  const store = createStoreStub();
  const doc = createDocumentStub();
  const win = createWindowStub();

  const app = {
    store,
    runtimeConfig: {
      hostId: 'spwashi.work',
      embedMode: 'embedded'
    }
  };

  const hostManifest = {
    theming: {
      baseTokens: {
        '--color-accent': '#00b8d9'
      },
      combinations: [
        {
          id: 'mobile-home',
          hosts: ['spwashi.work'],
          routes: ['home'],
          media: { maxWidth: 720 },
          tokens: {
            '--color-accent': '#ff6600'
          },
          dataset: {
            host_theme_variant: 'mobile-home'
          }
        }
      ]
    }
  };

  const controller = installHostThemeCombinatorics({
    app,
    document: doc,
    window: win,
    hostManifest
  });

  assert.equal(doc.documentElement.style.getPropertyValue('--color-accent'), '#ff6600');
  assert.equal(doc.documentElement.dataset.hostThemeVariant, 'mobile-home');
  assert.equal(controller.getState().activeRuleIds[0], 'mobile-home');

  store.setState({ activeRoute: 'notes' });
  assert.equal(doc.documentElement.style.getPropertyValue('--color-accent'), '#00b8d9');

  controller.destroy();
  assert.equal(doc.documentElement.style.getPropertyValue('--color-accent'), '');
});
