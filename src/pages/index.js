import { initHomePage } from './home.js';
import { initNotesPage } from './notes.js';
import { initWorkPage } from './work.js';

export { applySlots, clearElementChildren } from './shared.js';
export { initHomePage } from './home.js';
export { initNotesPage } from './notes.js';
export { initWorkPage } from './work.js';

export const PAGE_INITIALIZERS = Object.freeze({
  home: initHomePage,
  work: initWorkPage,
  notes: initNotesPage
});
