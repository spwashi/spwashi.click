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
  registerSpwParserAdapter('test-adapter', (_input) => ({
    ok: true,
    parser: 'test-adapter',
    ast: {}
  }));

  const parsed = parseSpwForm('^module{ geometry }');
  assert.equal(parsed.ok, true);
  assert.equal(parsed.parser, 'test-adapter');
  assert.equal(parsed.ast.sigil, '^');
  assert.equal(parsed.ast.symbol, 'module');
  assert.equal(parsed.ast.body, 'geometry');

  clearSpwParserAdapter();
});

test('parseSpwForm normalizes workbench success-shape AST to canonical contract', () => {
  registerSpwParserAdapter('workbench-shape', () => ({
    success: true,
    ast: {
      type: 'Seed',
      expression: {
        type: 'Expression',
        terms: [
          {
            type: 'Operation',
            operator: { value: '!' },
            modifiers: { modifiers: [{ value: 'top' }] },
            frame: {
              content: [{ type: 'Literal', token: { value: '"home"' } }]
            }
          }
        ]
      }
    }
  }));

  const parsed = parseSpwForm('!top[home]{ route:notes profile:maximal }');
  assert.equal(parsed.ok, true);
  assert.equal(parsed.parser, 'workbench-shape');
  assert.equal(parsed.ast.sigil, '!');
  assert.equal(parsed.ast.symbol, 'top');
  assert.equal(parsed.ast.selector, 'home');
  assert.equal(parsed.ast.body, 'route:notes profile:maximal');

  clearSpwParserAdapter();
});

test('parseSpwForm guards against async adapter parse returns', () => {
  registerSpwParserAdapter('async-adapter', () => Promise.resolve({ ok: true }));

  const parsed = parseSpwForm('!top{ route:home }');
  assert.equal(parsed.ok, false);
  assert.equal(parsed.parser, 'async-adapter');
  assert.equal(parsed.reason, 'adapter-returned-promise');

  clearSpwParserAdapter();
});
