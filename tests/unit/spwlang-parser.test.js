import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearSpwParserAdapter,
  isLikelySpwForm,
  parseSpwForm,
  registerSpwParserAdapter
} from '../../src/core/spwlang-parser.js';

test('isLikelySpwForm detects sigil-brace forms', () => {
  assert.equal(isLikelySpwForm('^identity[spwashi]{ physics: spw }'), true);
  assert.equal(isLikelySpwForm('plain text'), false);
});

test('parseSpwForm fallback parses supported forms', () => {
  clearSpwParserAdapter();
  const parsed = parseSpwForm('^identity[spwashi]{ physics: spw }');

  assert.equal(parsed.ok, true);
  assert.equal(parsed.parser, 'fallback');
  assert.equal(parsed.ast.sigil, '^');
  assert.equal(parsed.ast.symbol, 'identity');
  assert.equal(parsed.ast.selector, 'spwashi');
});

test('registerSpwParserAdapter delegates parsing', () => {
  registerSpwParserAdapter('test-adapter', (input) => ({
    ok: true,
    parser: 'test-adapter',
    ast: { input }
  }));

  const parsed = parseSpwForm('^module{ geometry }');
  assert.equal(parsed.ok, true);
  assert.equal(parsed.parser, 'test-adapter');
  assert.equal(parsed.ast.input, '^module{ geometry }');

  clearSpwParserAdapter();
});
