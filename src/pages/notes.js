/**
 * ^intent:
 * ^intent[module]{ id:pages.notes mode:spwlang surface:web }
 * ^invariants:
 * ^invariant[form]{ determinism:locked contracts:explicit sidefx:bounded }
 * ^invariant[state]{ mutation:public-api projection:data+aria }
 * ^compose:
 * ^compose[neighbors]{ ingress:imports egress:exports bridge:event+store }
 */

import { applySlots, clearElementChildren } from './shared.js';

function renderNotes(doc, notes) {
  const list = doc.querySelector('[data-role="notes-list"]');
  if (!list) {
    return;
  }

  clearElementChildren(list);

  for (const note of notes) {
    const item = doc.createElement('article');
    item.className = 'note-card';
    item.id = note.id;

    const title = doc.createElement('h2');
    title.className = 'note-card__title';
    title.textContent = note.title_slot;

    const meta = doc.createElement('p');
    meta.className = 'note-card__date';
    meta.textContent = note.date_slot;

    const excerpt = doc.createElement('p');
    excerpt.className = 'note-card__excerpt';
    excerpt.textContent = note.excerpt_slot;

    item.append(title, meta, excerpt);
    list.append(item);
  }
}

export function initNotesPage({ manifest, document: doc }) {
  doc.title = manifest.metaTitle;
  applySlots(doc, manifest.slots);
  renderNotes(doc, manifest.notes);
}
