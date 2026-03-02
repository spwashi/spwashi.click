import { noteComponentLifecycle } from '../../core/runtime/js/ecology.js';

function summarizeSpecies(speciesSnapshot) {
  return Object.entries(speciesSnapshot)
    .sort(([leftTag], [rightTag]) => leftTag.localeCompare(rightTag))
    .map(([tagName, state]) => ({
      tagName,
      role: state.role,
      connected: state.counts.connected,
      rendered: state.counts.rendered,
      intent: state.counts.intent,
      lastLifecycle: state.lastLifecycle
    }));
}

class SpwEcologyMap extends HTMLElement {
  connectedCallback() {
    this.dataset.component = 'ecology-map';
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Web component ecology map');
    this.innerHTML = `
      <header class="ecology-map__header">
        <p class="page-section__eyebrow">Web Component Ecology</p>
        <h2 class="ecology-map__title">Species Ledger</h2>
      </header>
      <p class="ecology-map__meta" data-role="meta">Waiting for ecology snapshot.</p>
      <ul class="ecology-map__species" data-role="species-list"></ul>
      <svg class="ecology-map__constellation" viewBox="0 0 240 80" aria-hidden="true">
        <path d="M 10 50 C 58 16, 82 66, 126 30 S 196 10, 230 48" fill="none" stroke="currentColor" stroke-width="2"/>
        <circle cx="32" cy="46" r="5" />
        <circle cx="94" cy="44" r="5" />
        <circle cx="152" cy="34" r="5" />
        <circle cx="212" cy="44" r="5" />
      </svg>
    `;

    this.metaNode = this.querySelector('[data-role="meta"]');
    this.listNode = this.querySelector('[data-role="species-list"]');

    noteComponentLifecycle('spw-ecology-map', 'connected', { phase: 'mount' });
    this.attachEcologySubscription();
  }

  disconnectedCallback() {
    noteComponentLifecycle('spw-ecology-map', 'disconnected', { phase: 'unmount' });
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  attachEcologySubscription() {
    const app = window.__SPW_APP__;
    if (!app?.ecology) {
      return;
    }

    this.unsubscribe = app.ecology.subscribe((nextSnapshot) => {
      this.renderSnapshot(nextSnapshot);
    });

    this.renderSnapshot(app.ecology.getSnapshot());
  }

  renderSnapshot(snapshot) {
    this.dataset.phase = snapshot.phase;
    this.dataset.route = snapshot.route;
    this.dataset.lastReason = snapshot.lastReason;

    const speciesRows = summarizeSpecies(snapshot.species);
    this.style.setProperty('--species-count', String(speciesRows.length));

    this.metaNode.textContent = `Route: ${snapshot.route} · Phase: ${snapshot.phase} · Species: ${speciesRows.length}`;
    this.listNode.innerHTML = speciesRows
      .map(
        (speciesRow) => `
          <li class="ecology-map__species-row" data-tag="${speciesRow.tagName}" data-last-lifecycle="${speciesRow.lastLifecycle}">
            <span class="ecology-map__species-tag">${speciesRow.tagName}</span>
            <span class="ecology-map__species-role">${speciesRow.role}</span>
            <span class="ecology-map__species-counts">connected ${speciesRow.connected} · rendered ${speciesRow.rendered} · intent ${speciesRow.intent}</span>
          </li>
        `
      )
      .join('');

    noteComponentLifecycle('spw-ecology-map', 'rendered', {
      route: snapshot.route,
      phase: snapshot.phase,
      speciesCount: speciesRows.length
    });
  }
}

export function defineEcologyMap() {
  if (!customElements.get('spw-ecology-map')) {
    customElements.define('spw-ecology-map', SpwEcologyMap);
  }
}
