import { ensureAriaCurrent } from '../core/runtime/js/a11y.js';
import { noteComponentLifecycle } from '../core/runtime/js/ecology.js';
import { EVENT_NAVIGATE, dispatchTypedEvent } from '../core/runtime/js/events.js';

const ROUTE_ORDER = Object.freeze(['home', 'work', 'notes']);
const OPERATOR_TOKENS = Object.freeze(['?', '~', '@', '&', '*', '^', '!', '=', '%', '#', '.']);

function routeOffset(routeName) {
  const index = ROUTE_ORDER.indexOf(routeName);
  return index >= 0 ? index : 0;
}

class SpwSiteShell extends HTMLElement {
  static observedAttributes = ['route'];

  connectedCallback() {
    this.dataset.component = 'site-shell';
    this.setAttribute('data-phase', this.getAttribute('data-phase') ?? 'seed');
    this.transitionTimers = [];
    this.lastRoute = this.getAttribute('route') ?? 'home';
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
    this.ensureOperatorRail();
    this.attachStoreSubscription();
    this.syncFromAttribute();
  }

  disconnectedCallback() {
    noteComponentLifecycle('spw-site-shell', 'disconnected', {
      route: this.getAttribute('route') ?? 'home'
    });
    this.removeEventListener('click', this.onShellClick);
    this.clearTransitionTimers();
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
      if (nextState.activeRoute !== this.lastRoute) {
        this.setAttribute('route', nextState.activeRoute);
      }

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
    const previousRoute = this.lastRoute;
    this.lastRoute = route;
    this.dataset.route = route;
    ensureAriaCurrent(this, route);

    if (previousRoute && previousRoute !== route) {
      this.runOperatorTransition(previousRoute, route);
    }
  }

  ensureOperatorRail() {
    const header = this.querySelector('.site-header');
    if (!header || header.querySelector('[data-role="operator-rail"]')) {
      return;
    }

    const rail = document.createElement('div');
    rail.className = 'site-operator-rail';
    rail.dataset.role = 'operator-rail';
    rail.setAttribute('aria-hidden', 'true');
    rail.setAttribute('data-structure-label', 'Operator rail that twinkles on route changes');

    for (const symbol of OPERATOR_TOKENS) {
      const token = document.createElement('span');
      token.className = 'site-operator-token';
      token.dataset.state = 'idle';
      token.textContent = symbol;
      rail.append(token);
    }

    const nav = header.querySelector('.site-nav');
    if (nav?.parentElement === header) {
      header.insertBefore(rail, nav);
      return;
    }

    header.append(rail);
  }

  clearTransitionTimers() {
    for (const timer of this.transitionTimers) {
      window.clearTimeout(timer);
    }
    this.transitionTimers.length = 0;
  }

  runOperatorTransition(previousRoute, nextRoute) {
    const rail = this.querySelector('[data-role="operator-rail"]');
    if (!rail) {
      return;
    }

    const tokens = Array.from(rail.querySelectorAll('.site-operator-token'));
    if (tokens.length === 0) {
      return;
    }

    this.clearTransitionTimers();
    this.dataset.routeTransition = 'active';

    const reducedMotion = this.dataset.reducedMotion === 'true';
    const offset = routeOffset(nextRoute);

    tokens.forEach((token, index) => {
      const nextSymbol = OPERATOR_TOKENS[(index + offset) % OPERATOR_TOKENS.length];
      const delayMs = index * 28;

      const morphTimer = window.setTimeout(() => {
        token.dataset.state = 'morphing';
        token.textContent = nextSymbol;
      }, delayMs);
      this.transitionTimers.push(morphTimer);

      if (!reducedMotion) {
        const twinkleTimer = window.setTimeout(() => {
          token.dataset.state = 'twinkle';
        }, delayMs + 130);
        this.transitionTimers.push(twinkleTimer);
      }

      const settleTimer = window.setTimeout(() => {
        token.dataset.state = 'idle';
      }, delayMs + (reducedMotion ? 180 : 520));
      this.transitionTimers.push(settleTimer);
    });

    const doneTimer = window.setTimeout(() => {
      if (this.dataset.routeTransition === 'active') {
        this.dataset.routeTransition = 'idle';
      }
    }, reducedMotion ? 260 : 900);
    this.transitionTimers.push(doneTimer);

    noteComponentLifecycle('spw-site-shell', 'operator-transition', {
      from: previousRoute,
      to: nextRoute,
      reducedMotion
    });
  }
}

export function defineSiteShell() {
  if (!customElements.get('spw-site-shell')) {
    customElements.define('spw-site-shell', SpwSiteShell);
  }
}
