import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EVENT_INTENT_CLICK,
  EVENT_NAVIGATE,
  EVENT_PWA_STATE_CHANGED,
  KNOWN_EVENT_NAMES,
  createTypedEvent,
  dispatchTypedEvent,
  freezeDetail,
  isKnownEventName
} from '../../src/core/events.js';

test('known event names include core contracts', () => {
  assert.ok(KNOWN_EVENT_NAMES.includes(EVENT_INTENT_CLICK));
  assert.ok(KNOWN_EVENT_NAMES.includes(EVENT_NAVIGATE));
  assert.ok(KNOWN_EVENT_NAMES.includes(EVENT_PWA_STATE_CHANGED));
  assert.equal(isKnownEventName('spw:missing'), false);
  assert.equal(isKnownEventName(EVENT_INTENT_CLICK), true);
});

test('freezeDetail returns a frozen payload copy', () => {
  const source = { source: 'stage' };
  const detail = freezeDetail(source);

  assert.ok(Object.isFrozen(detail));
  assert.deepEqual(detail, source);
  assert.notEqual(detail, source);
});

test('createTypedEvent and dispatchTypedEvent preserve detail', () => {
  const detail = { source: 'test-suite' };
  const event = createTypedEvent(EVENT_INTENT_CLICK, detail);

  assert.equal(event.type, EVENT_INTENT_CLICK);
  assert.deepEqual(event.detail, detail);

  const target = {
    received: null,
    dispatchEvent(nextEvent) {
      this.received = nextEvent;
      return true;
    }
  };

  dispatchTypedEvent(target, EVENT_INTENT_CLICK, detail);
  assert.equal(target.received.type, EVENT_INTENT_CLICK);
  assert.deepEqual(target.received.detail, detail);
});
