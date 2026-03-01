import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clampNonNegativeInteger,
  intensityFromPhase,
  phaseFromClickCount,
  unlockedLayersFromPhase
} from '../../src/core/runtime/js/motion.js';

test('phaseFromClickCount maps click boundaries deterministically', () => {
  assert.equal(phaseFromClickCount(0), 'seed');
  assert.equal(phaseFromClickCount(2), 'seed');
  assert.equal(phaseFromClickCount(3), 'pulse');
  assert.equal(phaseFromClickCount(7), 'pulse');
  assert.equal(phaseFromClickCount(8), 'counterpoint');
  assert.equal(phaseFromClickCount(15), 'counterpoint');
  assert.equal(phaseFromClickCount(16), 'chorus');
});

test('unlockedLayersFromPhase increments by phase', () => {
  assert.deepEqual(unlockedLayersFromPhase('seed'), ['geometry']);
  assert.deepEqual(unlockedLayersFromPhase('pulse'), ['geometry', 'motion']);
  assert.deepEqual(unlockedLayersFromPhase('counterpoint'), ['geometry', 'motion', 'fragments']);
  assert.deepEqual(unlockedLayersFromPhase('chorus'), ['geometry', 'motion', 'fragments', 'highlights']);
});

test('intensityFromPhase and clampNonNegativeInteger remain bounded', () => {
  assert.equal(intensityFromPhase('seed'), 0);
  assert.equal(intensityFromPhase('pulse'), 1);
  assert.equal(intensityFromPhase('counterpoint'), 2);
  assert.equal(intensityFromPhase('chorus'), 3);

  assert.equal(clampNonNegativeInteger(-5), 0);
  assert.equal(clampNonNegativeInteger(2.9), 2);
  assert.equal(clampNonNegativeInteger(Number.NaN), 0);
});
