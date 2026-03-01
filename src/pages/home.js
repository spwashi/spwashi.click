/**
 * Intent:
 * Compose the home route with click-stage narrative, selected work previews, and progressive chapter panels.
 * Invariants:
 * Home route always exposes core copy even before any interaction occurs.
 * How this composes with neighbors:
 * Boot calls this initializer after store setup; shared helpers hydrate content slots and preview lists.
 */

import { applySlots, clearElementChildren } from './shared.js';

function renderSelectedWorkList(doc, selectedWorkItems) {
  const list = doc.querySelector('[data-role="selected-work-list"]');
  if (!list) {
    return;
  }

  clearElementChildren(list);

  for (const item of selectedWorkItems) {
    const listItem = doc.createElement('li');
    listItem.className = 'work-preview';

    const link = doc.createElement('a');
    link.href = item.href;
    link.className = 'work-preview__link';

    const title = doc.createElement('h3');
    title.className = 'work-preview__title';
    title.textContent = item.title_slot;

    const summary = doc.createElement('p');
    summary.className = 'work-preview__summary';
    summary.textContent = item.summary_slot;

    link.append(title, summary);
    listItem.append(link);
    list.append(listItem);
  }
}

function renderChapters(doc, chapters) {
  const container = doc.querySelector('[data-role="chapter-panels"]');
  if (!container) {
    return;
  }

  clearElementChildren(container);

  for (const chapter of chapters) {
    const panel = doc.createElement('spw-chapter-panel');
    panel.className = 'chapter-panel';
    panel.setAttribute('chapter', chapter.chapter);
    panel.setAttribute('unlock-at', chapter.unlockAt);
    panel.setAttribute('data-chapter', chapter.chapter);

    const heading = doc.createElement('h2');
    heading.textContent = chapter.heading;

    const body = doc.createElement('p');
    body.textContent = chapter.body;

    panel.append(heading, body);
    container.append(panel);
  }
}

export function initHomePage({ manifest, document: doc }) {
  doc.title = manifest.metaTitle;
  applySlots(doc, manifest.slots);
  renderSelectedWorkList(doc, manifest.selectedWork);
  renderChapters(doc, manifest.chapters);
}
