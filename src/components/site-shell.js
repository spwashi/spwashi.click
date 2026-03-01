/**
 * Intent:
 * Own global shell state projection so route, phase, and navigation affordances stay consistent across pages.
 * Invariants:
 * Route links are annotated with aria-current for the active route and host dataset mirrors store state.
 * How this composes with neighbors:
 * Boot provides the app store; this component subscribes and emits navigation intent events.
 */

import { ensureAriaCurrent } from '../core/a11y.js';
import { noteComponentLifecycle } from '../core/ecology.js';
import { EVENT_NAVIGATE, dispatchTypedEvent } from '../core/events.js';

class SpwSiteShell extends HTMLElement {
  static observedAttributes = ['route'];

  connectedCallback() {
    this.dataset.component = 'site-shell';
    this.setAttribute('data-phase', this.getAttribute('data-phase') ?? 'seed');
    noteComponentLifecycle('spw-site-shell', 'connected', {
      route: this.getAttribute('route') ?? 'home'
    });

    this.onShellClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest('a[href]');
      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:')) {
        return;
      }

      dispatchTypedEvent(window, EVENT_NAVIGATE, { href });
    };

    this.addEventListener('click', this.onShellClick);
    this.attachStoreSubscription();
    this.syncFromAttribute();
  }

  disconnectedCallback() {
    noteComponentLifecycle('spw-site-shell', 'disconnected', {
      route: this.getAttribute('route') ?? 'home'
    });
    this.removeEventListener('click', this.onShellClick);
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  attributeChangedCallback(name) {
    if (name === 'route') {
      this.syncFromAttribute();
    }
  }

  attachStoreSubscription() {
    const app = window.__SPW_APP__;
    if (!app?.store) {
      return;
    }

    this.unsubscribe = app.store.subscribe((nextState) => {
      this.dataset.phase = nextState.phase;
      this.dataset.clicks = String(nextState.clickCount);
      this.dataset.reducedMotion = nextState.reducedMotion ? 'true' : 'false';
      ensureAriaCurrent(this, nextState.activeRoute);
      noteComponentLifecycle('spw-site-shell', 'rendered', {
        route: nextState.activeRoute,
        phase: nextState.phase
      });
    });

    ensureAriaCurrent(this, app.store.getState().activeRoute);
  }

  syncFromAttribute() {
    const route = this.getAttribute('route') ?? 'home';
    this.dataset.route = route;
    ensureAriaCurrent(this, route);
  }
}

export function defineSiteShell() {
  if (!customElements.get('spw-site-shell')) {
    customElements.define('spw-site-shell', SpwSiteShell);
  }
}
