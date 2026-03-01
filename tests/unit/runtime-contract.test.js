import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RUNTIME_API_VERSION,
  compareVersion,
  createRuntimeApiContract,
  evaluateCompatibilityWindow,
  isVersionInRange
} from '../../src/core/runtime-contract.js';

test('compareVersion orders semantic versions deterministically', () => {
  assert.equal(compareVersion('1.0.0', '1.0.0'), 0);
  assert.equal(compareVersion('1.2.0', '1.1.9'), 1);
  assert.equal(compareVersion('1.0.5', '1.1.0'), -1);
});

test('isVersionInRange respects min and max bounds', () => {
  assert.equal(isVersionInRange('1.1.0', { min: '1.0.0', max: '2.0.0' }), true);
  assert.equal(isVersionInRange('0.9.0', { min: '1.0.0' }), false);
  assert.equal(isVersionInRange('2.1.0', { max: '2.0.0' }), false);
});

test('createRuntimeApiContract exposes frozen runtime metadata', () => {
  const contract = createRuntimeApiContract();
  assert.equal(contract.runtimeApiVersion, RUNTIME_API_VERSION);
  assert.ok(Object.isFrozen(contract.interfaces));
});

test('evaluateCompatibilityWindow projects compatibility status', () => {
  const compatibility = evaluateCompatibilityWindow(
    { minRuntimeApi: '1.0.0', maxRuntimeApi: '2.0.0' },
    '1.1.0'
  );
  assert.equal(compatibility.compatible, true);
  assert.equal(compatibility.minRuntimeApi, '1.0.0');
  assert.equal(compatibility.maxRuntimeApi, '2.0.0');
});
