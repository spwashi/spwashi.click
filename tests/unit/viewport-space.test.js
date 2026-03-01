import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeSpaceMode,
  resolveAspectBand,
  resolveViewportBand,
  resolveViewportSpace
} from '../../src/core/runtime/js/viewport-space.js';

test('resolveViewportBand projects nano, compact, and immersive bands', () => {
  assert.equal(resolveViewportBand(320, { compactBreakpoint: 640, mobileBreakpoint: 900 }), 'nano');
  assert.equal(resolveViewportBand(820, { compactBreakpoint: 640, mobileBreakpoint: 900 }), 'compact');
  assert.equal(resolveViewportBand(1280, { compactBreakpoint: 640, mobileBreakpoint: 900 }), 'immersive');
});

test('resolveViewportSpace derives adaptive space defaults from viewport geometry', () => {
  const compact = resolveViewportSpace({
    mode: 'adaptive',
    width: 360,
    height: 680,
    mobileBreakpoint: 900,
    compactBreakpoint: 640
  });

  assert.equal(compact.band, 'nano');
  assert.equal(compact.mobile, true);
  assert.equal(compact.aspect, 'portrait');
  assert.equal(compact.spaceMode, 'compact');
  assert.equal(compact.spaceLayer, 'stack');
});

test('resolveViewportSpace honors explicit space controls and normalization', () => {
  const explicit = resolveViewportSpace({
    mode: 'fixed',
    width: 1440,
    height: 860,
    spaceMode: normalizeSpaceMode('expansive'),
    spaceLayer: 'nested',
    band: 'immersive'
  });

  assert.equal(explicit.mode, 'fixed');
  assert.equal(explicit.band, 'immersive');
  assert.equal(explicit.mobile, false);
  assert.equal(explicit.spaceMode, 'expansive');
  assert.equal(explicit.spaceLayer, 'nested');
  assert.equal(resolveAspectBand(explicit.width, explicit.height), 'landscape');
});
