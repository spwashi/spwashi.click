import test from 'node:test';
import assert from 'node:assert/strict';

import { createStore } from '../../src/core/runtime/js/store.js';

test('store initializes with immutable snapshot', () => {
  const store = createStore({ activeRoute: 'home' });
  const state = store.getState();

  assert.equal(state.clickCount, 0);
  assert.equal(state.phase, 'seed');
  assert.equal(state.activeRoute, 'home');
  assert.ok(Object.isFrozen(state));
  assert.ok(Object.isFrozen(state.unlockedLayers));
});

test('registerClick advances deterministic phases', () => {
  const store = createStore({ activeRoute: 'home' });

  for (let count = 0; count < 3; count += 1) {
    store.registerClick('test');
  }
  assert.equal(store.getState().phase, 'pulse');

  for (let count = 0; count < 5; count += 1) {
    store.registerClick('test');
  }
  assert.equal(store.getState().phase, 'counterpoint');

  for (let count = 0; count < 8; count += 1) {
    store.registerClick('test');
  }
  assert.equal(store.getState().phase, 'chorus');
  assert.equal(store.getState().clickCount, 16);
});

test('subscribe and unsubscribe keep listener lifecycle explicit', () => {
  const store = createStore();
  const calls = [];

  const unsubscribe = store.subscribe((nextState, previousState, reason) => {
    calls.push({ nextState, previousState, reason });
  });

  store.setRoute('work');
  unsubscribe();
  store.setRoute('notes');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].reason, 'route:set');
  assert.equal(calls[0].nextState.activeRoute, 'work');
});
