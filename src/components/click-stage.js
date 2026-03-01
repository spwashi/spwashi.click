import { emitIntentClick, createTapTracker } from '../core/runtime/js/intent-kit.js';
import { noteComponentLifecycle } from '../core/runtime/js/ecology.js';
import { intensityFromPhase } from '../core/runtime/js/motion.js';
import { installSporadicSpaceSampler } from '../core/runtime/js/space-metrics.js';

const PHASE_COPY = Object.freeze({
  seed: '^phase[seed]{ model: geometry-init learn: click=>state }',
  pulse: '^phase[pulse]{ model: motion-entry learn: state=>tempo }',
  counterpoint: '^phase[counterpoint]{ model: fragment-weave learn: relation=>meaning }',
  chorus: '^phase[chorus]{ model: full-combinatorics learn: system=>presence }'
});

const PHASE_STATUS_COPY = Object.freeze({
  seed: '^phase{ state:seed mode:structure }',
  pulse: '^phase{ state:pulse mode:motion }',
  counterpoint: '^phase{ state:counterpoint mode:layering }',
  chorus: '^phase{ state:chorus mode:full-scene }'
});

function isTextEntryTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }

  return target.getAttribute('contenteditable') === 'true';
}

class SpwClickStage extends HTMLElement {
  static observedAttributes = ['phase', 'clicks'];

  connectedCallback() {
    this.dataset.component = 'click-stage';
    this.setAttribute('role', 'group');
    this.setAttribute('aria-label', this.getAttribute('aria-label') ?? 'Interactive click stage');
    this.setAttribute('aria-keyshortcuts', 'Enter Space ArrowRight');
    this.tabIndex = 0;
    noteComponentLifecycle('spw-click-stage', 'connected', {
      phase: this.getAttribute('phase') ?? 'seed'
    });

    this.ensureScaffolding();
    this.tapTracker = createTapTracker();
    this.bindIntents();
    this.installSpaceSampler();
    this.attachStoreSubscription();
    this.renderFromState(window.__SPW_APP__?.store?.getState());
  }

  disconnectedCallback() {
    noteComponentLifecycle('spw-click-stage', 'disconnected', {
      phase: this.getAttribute('phase') ?? 'seed'
    });
    if (this.triggerButton && this.onClickIntent) {
      this.triggerButton.removeEventListener('click', this.onClickIntent);
    }
    this.removeEventListener('pointerdown', this.onPointerDown);
    this.removeEventListener('pointerup', this.onPointerUp);
    this.removeEventListener('pointercancel', this.onPointerCancel);
    this.removeEventListener('keydown', this.onKeyIntent);
    this.cleanupSpaceSampler?.();
    this.cleanupSpaceSampler = null;

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  attributeChangedCallback(name) {
    if ((name === 'phase' || name === 'clicks') && this.isConnected) {
      this.renderFromAttributes();
    }
  }

  ensureScaffolding() {
    if (!this.querySelector('[data-role="click-trigger"]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'click-stage__trigger';
      button.dataset.role = 'click-trigger';
      button.setAttribute('aria-controls', 'click-stage-status');
      button.setAttribute('aria-keyshortcuts', 'Enter Space ArrowRight');
      button.textContent = 'Tap to evolve scene';
      this.prepend(button);
    }

    if (!this.querySelector('[data-role="status"]')) {
      const status = document.createElement('p');
      status.id = 'click-stage-status';
      status.className = 'click-stage__status';
      status.dataset.role = 'status';
      status.setAttribute('aria-live', 'polite');
      this.append(status);
    }

    if (!this.querySelector('[data-role="svg-score"]')) {
      const score = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      score.setAttribute('viewBox', '0 0 320 120');
      score.setAttribute('class', 'click-stage__score');
      score.setAttribute('aria-hidden', 'true');
      score.dataset.role = 'svg-score';

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M 10 70 C 60 20, 120 95, 170 40 S 260 20, 310 65');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', '3');
      path.setAttribute('data-layer', 'motion');

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '70');
      circle.setAttribute('cy', '60');
      circle.setAttribute('r', '18');
      circle.setAttribute('data-layer', 'geometry');

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '210');
      rect.setAttribute('y', '35');
      rect.setAttribute('width', '70');
      rect.setAttribute('height', '50');
      rect.setAttribute('rx', '8');
      rect.setAttribute('data-layer', 'highlights');

      score.append(path, circle, rect);
      this.append(score);
    }

    if (!this.querySelector('spw-rhythm-grid')) {
      const rhythmGrid = document.createElement('spw-rhythm-grid');
      rhythmGrid.setAttribute('intensity', '0');
      this.append(rhythmGrid);
    }

    this.triggerButton = this.querySelector('[data-role="click-trigger"]');
    this.statusNode = this.querySelector('[data-role="status"]');
    this.rhythmGrid = this.querySelector('spw-rhythm-grid');
    this.layerNodes = Array.from(this.querySelectorAll('[data-layer]'));
  }

  bindIntents() {
    this.onClickIntent = () => {
      this.emitClickIntent('click-stage');
    };

    this.onKeyIntent = (event) => {
      if (isTextEntryTarget(event.target)) {
        return;
      }

      const onTriggerButton =
        event.target instanceof Element &&
        Boolean(event.target.closest('[data-role="click-trigger"]'));
      if (onTriggerButton && (event.key === 'Enter' || event.key === ' ')) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowRight') {
        event.preventDefault();
        this.emitClickIntent('click-stage:keyboard');
      }
    };

    this.onPointerDown = (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      this.tapTracker.start(event);
    };

    this.onPointerUp = (event) => {
      const onTriggerButton =
        event.target instanceof Element &&
        Boolean(event.target.closest('[data-role=\"click-trigger\"]'));

      if (onTriggerButton || !this.tapTracker.isTap(event)) {
        return;
      }

      this.emitClickIntent('click-stage:tap');
    };

    this.onPointerCancel = () => {
      this.tapTracker.reset();
    };

    this.triggerButton.addEventListener('click', this.onClickIntent);
    this.addEventListener('pointerdown', this.onPointerDown, { passive: true });
    this.addEventListener('pointerup', this.onPointerUp);
    this.addEventListener('pointercancel', this.onPointerCancel);
    this.addEventListener('keydown', this.onKeyIntent);
  }

  emitClickIntent(source) {
    emitIntentClick(this, {
      source,
      lifecycleTag: 'spw-click-stage'
    });
  }

  installSpaceSampler() {
    this.cleanupSpaceSampler?.();
    this.cleanupSpaceSampler = installSporadicSpaceSampler({
      node: this,
      intervalMs: 2400,
      minDelta: 10,
      onSample: (metrics) => {
        this.applySpaceMetrics(metrics);
      }
    });
  }

  applySpaceMetrics(metrics) {
    this.dataset.inlineBand = metrics.inlineBand;
    this.dataset.blockBand = metrics.blockBand;
    this.dataset.areaBand = metrics.areaBand;
    this.style.setProperty('--stage-inline-size', `${metrics.width}px`);
    this.style.setProperty('--stage-block-size', `${metrics.height}px`);
  }

  attachStoreSubscription() {
    const app = window.__SPW_APP__;
    if (!app?.store) {
      return;
    }

    this.unsubscribe = app.store.subscribe((nextState) => {
      this.renderFromState(nextState);
    });
  }

  renderFromAttributes() {
    const phase = this.getAttribute('phase') ?? 'seed';
    const clickCount = Number.parseInt(this.getAttribute('clicks') ?? '0', 10);

    this.dataset.phase = phase;
    this.dataset.clicks = String(Number.isFinite(clickCount) ? clickCount : 0);
  }

  renderFromState(state) {
    if (!state) {
      return;
    }

    const renderKey = `${state.phase}:${state.clickCount}:${state.unlockedLayers.join('|')}`;
    if (this.lastRenderKey === renderKey) {
      return;
    }
    this.lastRenderKey = renderKey;

    this.setAttribute('phase', state.phase);
    this.setAttribute('clicks', String(state.clickCount));
    this.dataset.phase = state.phase;
    this.dataset.clicks = String(state.clickCount);

    if (this.statusNode) {
      const statusCopy = PHASE_STATUS_COPY[state.phase] ?? PHASE_COPY[state.phase];
      this.statusNode.textContent = `${statusCopy} taps:${state.clickCount}.`;
    }

    if (this.rhythmGrid) {
      this.rhythmGrid.setAttribute('intensity', String(intensityFromPhase(state.phase)));
    }

    for (const layerNode of this.layerNodes ?? []) {
      const layerName = layerNode.getAttribute('data-layer');
      const layerUnlocked = state.unlockedLayers.includes(layerName);
      layerNode.setAttribute('data-unlocked', layerUnlocked ? 'true' : 'false');
    }

    noteComponentLifecycle('spw-click-stage', 'rendered', {
      phase: state.phase,
      clickCount: state.clickCount
    });
  }
}

export function defineClickStage() {
  if (!customElements.get('spw-click-stage')) {
    customElements.define('spw-click-stage', SpwClickStage);
  }
}
