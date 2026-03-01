/**
 * ^intent:
 * ^intent[module]{ id:runtime.index mode:spwlang surface:web }
 * ^invariants:
 * ^invariant[form]{ determinism:locked contracts:explicit sidefx:bounded }
 * ^invariant[state]{ mutation:public-api projection:data+aria }
 * ^compose:
 * ^compose[neighbors]{ ingress:imports egress:exports bridge:event+store }
 */

export { createSpwRuntime, mountSpwRuntime, showBootFailureMessage } from '../core/runtime.js';
export { readRuntimeConfig, resolveRuntimeAssetUrl } from '../core/runtime-config.js';

