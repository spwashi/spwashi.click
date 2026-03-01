/**
 * ^intent:
 * ^intent[module]{ id:pages.work mode:spwlang surface:web }
 * ^invariants:
 * ^invariant[form]{ determinism:locked contracts:explicit sidefx:bounded }
 * ^invariant[state]{ mutation:public-api projection:data+aria }
 * ^compose:
 * ^compose[neighbors]{ ingress:imports egress:exports bridge:event+store }
 */

import { applySlots, clearElementChildren } from './shared.js';

function renderProjects(doc, projects) {
  const grid = doc.querySelector('[data-role="project-grid"]');
  if (!grid) {
    return;
  }

  clearElementChildren(grid);

  for (const project of projects) {
    const article = doc.createElement('article');
    article.className = 'project-card';
    article.id = project.id;
    article.dataset.projectId = project.id;

    const title = doc.createElement('h2');
    title.className = 'project-card__title';
    title.textContent = project.title_slot;

    const role = doc.createElement('p');
    role.className = 'project-card__role';
    role.textContent = project.role_slot;

    const summary = doc.createElement('p');
    summary.className = 'project-card__summary';
    summary.textContent = project.summary_slot;

    const metrics = doc.createElement('p');
    metrics.className = 'project-card__metrics';
    metrics.textContent = project.metrics_slot;

    article.append(title, role, summary, metrics);
    grid.append(article);
  }
}

export function initWorkPage({ manifest, document: doc }) {
  doc.title = manifest.metaTitle;
  applySlots(doc, manifest.slots);
  renderProjects(doc, manifest.projects);
}
