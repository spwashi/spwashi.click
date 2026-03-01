/**
 * Intent:
 * Register all custom elements from one place so boot order is explicit and deterministic.
 * Invariants:
 * Each element is defined at most once and keeps a stable tag name contract.
 * How this composes with neighbors:
 * Boot calls defineAllComponents after store creation so upgraded elements can subscribe immediately.
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
