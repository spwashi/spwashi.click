import { phaseWeight } from '../../core/runtime/js/motion.js';
import { noteComponentLifecycle } from '../../core/runtime/js/ecology.js';

function isUnlocked(activePhase, unlockAtPhase) {
  return phaseWeight(activePhase) >= phaseWeight(unlockAtPhase);
}

class SpwChapterPanel extends HTMLElement {
  static observedAttributes = ['unlock-at'];

  connectedCallback() {
    this.dataset.component = 'chapter-panel';
    this.setAttribute('role', 'region');
    noteComponentLifecycle('spw-chapter-panel', 'connected', {
      chapter: this.getAttribute('chapter') ?? 'unknown'
    });

    const heading = this.querySelector('h2, h3, h4');
    if (heading && !heading.id) {
      heading.id = `chapter-${this.getAttribute('chapter') ?? 'untitled'}`;
    }

    if (heading) {
      this.setAttribute('aria-labelledby', heading.id);
    }

    this.attachStoreSubscription();
  }

  disconnectedCallback() {
    noteComponentLifecycle('spw-chapter-panel', 'disconnected', {
      chapter: this.getAttribute('chapter') ?? 'unknown'
    });
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  attributeChangedCallback(name) {
    if (name === 'unlock-at' && this.isConnected) {
      this.applyLockState(window.__SPW_APP__?.store?.getState()?.phase ?? 'seed');
    }
  }

  attachStoreSubscription() {
    const app = window.__SPW_APP__;
    if (!app?.store) {
      return;
    }

    this.unsubscribe = app.store.subscribe((nextState) => {
      this.applyLockState(nextState.phase);
    });

    this.applyLockState(app.store.getState().phase);
  }

  applyLockState(activePhase) {
    const unlockAt = this.getAttribute('unlock-at') ?? 'seed';
    const unlocked = isUnlocked(activePhase, unlockAt);

    this.dataset.locked = unlocked ? 'false' : 'true';
    this.setAttribute('aria-disabled', unlocked ? 'false' : 'true');
    noteComponentLifecycle('spw-chapter-panel', 'rendered', {
      chapter: this.getAttribute('chapter') ?? 'unknown',
      locked: this.dataset.locked
    });
  }
}

export function defineChapterPanel() {
  if (!customElements.get('spw-chapter-panel')) {
    customElements.define('spw-chapter-panel', SpwChapterPanel);
  }
}
