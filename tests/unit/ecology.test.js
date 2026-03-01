import test from 'node:test';
import assert from 'node:assert/strict';

import { CORE_SPECIES, createEcologyLedger } from '../../src/core/ecology.js';

test('createEcologyLedger seeds species and returns immutable snapshots', () => {
  const ecology = createEcologyLedger(CORE_SPECIES);
  const snapshot = ecology.getSnapshot();

  assert.ok(Object.isFrozen(snapshot));
  assert.ok(Object.keys(snapshot.species).length >= CORE_SPECIES.length);
  assert.ok(snapshot.species['spw-site-shell']);
});

test('noteLifecycle increments counters and tracks route/phase transitions', () => {
  const ecology = createEcologyLedger([]);

  ecology.registerSpecies({
    tagName: 'spw-example',
    role: 'probe',
    dependsOn: [],
    emits: []
  });
  ecology.setRoute('notes');
  ecology.setPhase('counterpoint');
  ecology.noteLifecycle('spw-example', 'connected', { reason: 'test' });
  ecology.noteLifecycle('spw-example', 'rendered', { reason: 'test' });

  const snapshot = ecology.getSnapshot();
  assert.equal(snapshot.route, 'notes');
  assert.equal(snapshot.phase, 'counterpoint');
  assert.equal(snapshot.species['spw-example'].counts.connected, 1);
  assert.equal(snapshot.species['spw-example'].counts.rendered, 1);
});
