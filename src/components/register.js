/**
 * ^intent:
 * ^intent[module]{ id:components.register mode:spwlang surface:web }
 * ^invariants:
 * ^invariant[form]{ determinism:locked contracts:explicit sidefx:bounded }
 * ^invariant[state]{ mutation:public-api projection:data+aria }
 * ^compose:
 * ^compose[neighbors]{ ingress:imports egress:exports bridge:event+store }
 */

import { CORE_SPECIES } from '../core/ecology.js';
import { defineChapterPanel } from './chapter-panel.js';
import { defineClickStage } from './click-stage.js';
import { defineEcologyMap } from './ecology-map.js';
import { defineRhythmGrid } from './rhythm-grid.js';
import { defineShaderField } from './shader-field.js';
import { defineSiteShell } from './site-shell.js';
import { defineSyntaxLab } from './syntax-lab.js';

export function defineAllComponents(ecology) {
  defineSiteShell();
  defineClickStage();
  defineChapterPanel();
  defineRhythmGrid();
  defineEcologyMap();
  defineShaderField();
  defineSyntaxLab();

  if (ecology) {
    for (const species of CORE_SPECIES) {
      ecology.registerSpecies(species);
    }
  }
}
