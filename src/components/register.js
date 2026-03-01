import { CORE_SPECIES } from '../core/runtime/js/ecology.js';
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
