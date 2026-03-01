/**
 * ^intent:
 * ^intent[module]{ id:core.boot mode:spwlang surface:web }
 * ^invariants:
 * ^invariant[form]{ determinism:locked contracts:explicit sidefx:bounded }
 * ^invariant[state]{ mutation:public-api projection:data+aria }
 * ^compose:
 * ^compose[neighbors]{ ingress:imports egress:exports bridge:event+store }
 */

import { readRuntimeConfig } from './runtime-config.js';
import { mountSpwRuntime, showBootFailureMessage } from './runtime.js';

export { createSpwRuntime, mountSpwRuntime, showBootFailureMessage } from './runtime.js';

function canAutoMount(doc) {
  const runtimeConfig = readRuntimeConfig({ documentRef: doc });
  return runtimeConfig.autoMount;
}

function startStandaloneMount(doc, win) {
  if (!canAutoMount(doc)) {
    return;
  }

  mountSpwRuntime({ document: doc, window: win }).catch((error) => {
    console.error('Boot failed', error);
    showBootFailureMessage(doc);
  });
}

const doc = globalThis.document;
const win = globalThis.window;

if (doc && win) {
  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', () => {
      startStandaloneMount(doc, win);
    }, { once: true });
  } else {
    startStandaloneMount(doc, win);
  }
}

