import test from 'node:test';
import assert from 'node:assert/strict';

import { installSporadicSpaceSampler, sampleElementSpace } from '../../src/core/runtime/js/space-metrics.js';

test('sampleElementSpace returns deterministic normalized bands', () => {
  const node = {
    getBoundingClientRect() {
      return {
        width: 912.8,
        height: 488.2
      };
    }
  };

  const sample = sampleElementSpace(node);
  assert.equal(sample.width, 913);
  assert.equal(sample.height, 488);
  assert.equal(sample.inlineBand, 'wide');
  assert.equal(sample.blockBand, 'tall');
  assert.equal(sample.areaBand, 'stage');
});

test('installSporadicSpaceSampler publishes init + changed interval samples', () => {
  let width = 480;
  const node = {
    getBoundingClientRect() {
      return { width, height: 320 };
    }
  };

  const intervalFns = [];
  const observed = [];
  const disconnected = [];

  class ResizeObserverStub {
    constructor(callback) {
      this.callback = callback;
    }

    observe(target) {
      observed.push(target);
    }

    disconnect() {
      disconnected.push(true);
    }
  }

  const windowStub = {
    ResizeObserver: ResizeObserverStub,
    setInterval(callback) {
      intervalFns.push(callback);
      return 1;
    },
    clearInterval() {}
  };

  const calls = [];
  const cleanup = installSporadicSpaceSampler({
    node,
    windowRef: windowStub,
    intervalMs: 900,
    minDelta: 4,
    onSample(sample, reason) {
      calls.push({ sample, reason });
    }
  });

  assert.equal(calls[0].reason, 'init');
  assert.equal(observed.length, 1);

  width = 610;
  intervalFns[0]();
  assert.equal(calls[calls.length - 1].reason, 'interval');
  assert.equal(calls[calls.length - 1].sample.inlineBand, 'medium');

  cleanup();
  assert.equal(disconnected.length, 1);
});
