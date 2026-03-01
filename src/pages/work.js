/**
 * Intent:
 * Compose the work route as structured project cards with explicit placeholder slots for later case studies.
 * Invariants:
 * Every project card keeps a stable id anchor and consistent semantic structure.
 * How this composes with neighbors:
 * Shares shell/component system with other routes while hydrating work-specific manifest content.
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
