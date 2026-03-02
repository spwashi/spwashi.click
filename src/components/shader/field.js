import { noteComponentLifecycle } from '../../core/runtime/js/ecology.js';
import { createTapTracker, emitIntentClick } from '../../core/runtime/js/intent/kit.js';
import { installSporadicSpaceSampler } from '../../core/runtime/js/space/metrics.js';

const PROFILE_FRAME_RATE = Object.freeze({
  seed: 12,
  field: 30,
  maximal: 56
});

const PHASE_GAIN = Object.freeze({
  seed: 0.42,
  pulse: 0.64,
  counterpoint: 0.9,
  chorus: 1.12
});

function clamp01(value) {
  const parsed = Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) {
    return 0.5;
  }

  return Math.max(0, Math.min(1, parsed));
}

function profileFrameRate(profile) {
  return PROFILE_FRAME_RATE[profile] ?? PROFILE_FRAME_RATE.field;
}

function phaseGain(phase) {
  return PHASE_GAIN[phase] ?? PHASE_GAIN.seed;
}

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

function rgbaFromHex(hex, alpha) {
  const normalizedHex = String(hex ?? '')
    .trim()
    .replace('#', '');

  if (normalizedHex.length !== 6 || !/^[0-9a-fA-F]+$/.test(normalizedHex)) {
    return `rgba(0, 184, 217, ${alpha})`;
  }

  const red = Number.parseInt(normalizedHex.slice(0, 2), 16);
  const green = Number.parseInt(normalizedHex.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedHex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

class SpwShaderField extends HTMLElement {
  connectedCallback() {
    this.dataset.component = 'shader-field';
    this.setAttribute('role', 'group');
    this.setAttribute('aria-label', this.getAttribute('aria-label') ?? 'Shader interaction field');
    this.setAttribute(
      'aria-keyshortcuts',
      'ArrowLeft ArrowRight ArrowUp ArrowDown Enter Space KeyR'
    );
    this.tabIndex = 0;

    this.state = {
      pointerX: 0.52,
      pointerY: 0.44,
      phase: document.documentElement.dataset.phase ?? 'seed',
      profile: document.documentElement.dataset.performanceProfile ?? 'field',
      clickCount: Number.parseInt(document.documentElement.dataset.clickCount ?? '0', 10) || 0
    };

    this.canvas = null;
    this.context = null;
    this.statusNode = null;
    this.injectNode = null;
    this.pixelWidth = 0;
    this.pixelHeight = 0;
    this.frameHandle = 0;
    this.lastFrameMs = 0;

    this.renderScaffold();
    this.tapTracker = createTapTracker();
    this.bindIntents();
    this.attachStoreSubscription();
    this.installSpaceSampler();
    this.resizeCanvas();
    this.tick(performance.now());

    noteComponentLifecycle('spw-shader-field', 'connected', {
      phase: this.state.phase,
      profile: this.state.profile
    });
  }

  disconnectedCallback() {
    this.removeEventListener('pointermove', this.onPointerMove);
    this.removeEventListener('pointerdown', this.onPointerDown);
    this.removeEventListener('pointerup', this.onPointerUp);
    this.removeEventListener('pointercancel', this.onPointerCancel);
    this.removeEventListener('keydown', this.onKeydown);
    this.injectNode?.removeEventListener('click', this.onInjectClick);
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.cleanupSpaceSampler?.();
    this.cleanupSpaceSampler = null;

    if (this.frameHandle) {
      cancelAnimationFrame(this.frameHandle);
      this.frameHandle = 0;
    }

    noteComponentLifecycle('spw-shader-field', 'disconnected', {
      phase: this.state.phase,
      profile: this.state.profile
    });
  }

  renderScaffold() {
    this.innerHTML = `
      <div class="shader-field__surface" data-role="surface" data-structure-label="Interactive shader surface rendered on canvas with pointer and keyboard steering">
        <canvas class="shader-field__canvas" data-role="canvas" aria-hidden="true"></canvas>
      </div>
      <div class="shader-field__hud" data-structure-label="Shader controls and state telemetry">
        <p class="shader-field__status" data-role="status" aria-live="polite"></p>
        <button type="button" class="shader-field__inject" data-role="inject" aria-label="Inject click intent from shader field">
          Inject Tap
        </button>
      </div>
    `;

    this.canvas = this.querySelector('[data-role="canvas"]');
    this.context = this.canvas?.getContext('2d', { alpha: true });
    this.statusNode = this.querySelector('[data-role="status"]');
    this.injectNode = this.querySelector('[data-role="inject"]');
  }

  bindIntents() {
    this.onPointerMove = (event) => {
      const rect = this.canvas?.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) {
        return;
      }

      this.state.pointerX = clamp01((event.clientX - rect.left) / rect.width);
      this.state.pointerY = clamp01((event.clientY - rect.top) / rect.height);
      this.renderStatus('pointer');
    };

    this.onPointerDown = (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const onInjectButton =
        event.target instanceof Element &&
        Boolean(event.target.closest('[data-role="inject"]'));
      if (onInjectButton) {
        return;
      }

      this.tapTracker.start(event);
    };

    this.onPointerUp = (event) => {
      const onInjectButton =
        event.target instanceof Element &&
        Boolean(event.target.closest('[data-role="inject"]'));

      if (onInjectButton || !this.tapTracker.isTap(event)) {
        return;
      }

      this.emitClickIntent('shader-field:tap');
    };

    this.onPointerCancel = () => {
      this.tapTracker.reset();
    };

    this.onKeydown = (event) => {
      if (isTextEntryTarget(event.target)) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const step = 0.06;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.state.pointerX = clamp01(this.state.pointerX - step);
        this.renderStatus('keyboard:left');
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.state.pointerX = clamp01(this.state.pointerX + step);
        this.renderStatus('keyboard:right');
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.state.pointerY = clamp01(this.state.pointerY - step);
        this.renderStatus('keyboard:up');
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.state.pointerY = clamp01(this.state.pointerY + step);
        this.renderStatus('keyboard:down');
        return;
      }

      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        this.state.pointerX = 0.52;
        this.state.pointerY = 0.44;
        this.renderStatus('keyboard:reset');
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.emitClickIntent('shader-field:keyboard');
      }
    };

    this.onInjectClick = () => {
      this.emitClickIntent('shader-field:button');
    };

    this.addEventListener('pointermove', this.onPointerMove, { passive: true });
    this.addEventListener('pointerdown', this.onPointerDown);
    this.addEventListener('pointerup', this.onPointerUp);
    this.addEventListener('pointercancel', this.onPointerCancel);
    this.addEventListener('keydown', this.onKeydown);
    this.injectNode?.addEventListener('click', this.onInjectClick);
  }

  attachStoreSubscription() {
    const app = window.__SPW_APP__;
    if (!app?.store) {
      return;
    }

    this.unsubscribe = app.store.subscribe((nextState) => {
      this.state.phase = nextState.phase;
      this.state.clickCount = nextState.clickCount;
      this.renderStatus('state');
    });
  }

  installSpaceSampler() {
    this.cleanupSpaceSampler?.();
    this.cleanupSpaceSampler = installSporadicSpaceSampler({
      node: this,
      intervalMs: 2800,
      minDelta: 14,
      onSample: (metrics) => {
        this.dataset.inlineBand = metrics.inlineBand;
        this.dataset.blockBand = metrics.blockBand;
        this.dataset.areaBand = metrics.areaBand;
        this.style.setProperty('--shader-inline-size', `${metrics.width}px`);
        this.style.setProperty('--shader-block-size', `${metrics.height}px`);
        this.resizeCanvas();
      }
    });
  }

  resizeCanvas() {
    if (!this.canvas || !this.context) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const pixelRatio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const width = Math.max(1, Math.round(rect.width * pixelRatio));
    const height = Math.max(1, Math.round(rect.height * pixelRatio));

    if (width === this.pixelWidth && height === this.pixelHeight) {
      return;
    }

    this.pixelWidth = width;
    this.pixelHeight = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  emitClickIntent(source) {
    emitIntentClick(this, {
      source,
      lifecycleTag: 'spw-shader-field',
      detail: {
        phase: this.state.phase,
        clickCount: this.state.clickCount
      }
    });
  }

  renderStatus(reason) {
    if (!this.statusNode) {
      return;
    }

    const pointerX = this.state.pointerX.toFixed(2);
    const pointerY = this.state.pointerY.toFixed(2);
    const reasonHint =
      this.dataset.verboseStatus === 'true'
        ? ` source:${reason}`
        : '';
    this.statusNode.textContent =
      `^shader{ phase:${this.state.phase} profile:${this.state.profile} focus:${pointerX}|${pointerY} taps:${this.state.clickCount}${reasonHint} }`;
  }

  drawFrame(timeMs) {
    if (!this.context || !this.canvas) {
      return;
    }

    const root = document.documentElement;
    const reducedMotion = root.dataset.reducedMotion === 'true';
    this.state.profile = root.dataset.performanceProfile ?? 'field';
    this.state.phase = root.dataset.phase ?? this.state.phase;

    this.resizeCanvas();

    const width = this.canvas.width;
    const height = this.canvas.height;
    const phaseFactor = phaseGain(this.state.phase);
    const profileFactor = this.state.profile === 'maximal' ? 1 : this.state.profile === 'seed' ? 0.58 : 0.82;
    const motionFactor = reducedMotion ? 0.25 : 1;
    const time = reducedMotion ? this.state.clickCount * 0.09 : timeMs / 1000;
    const focusX = this.state.pointerX * width;
    const focusY = this.state.pointerY * height;

    const styles = getComputedStyle(root);
    const accent = styles.getPropertyValue('--color-accent').trim() || '#00b8d9';
    const brass = styles.getPropertyValue('--color-brass').trim() || '#be8f2f';
    const ink = styles.getPropertyValue('--color-ink').trim() || '#1f2a2f';

    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.clearRect(0, 0, width, height);

    const background = this.context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, rgbaFromHex(ink, 0.22));
    background.addColorStop(1, rgbaFromHex(ink, 0.08));
    this.context.fillStyle = background;
    this.context.fillRect(0, 0, width, height);

    const focalGradient = this.context.createRadialGradient(
      focusX,
      focusY,
      width * 0.04,
      focusX,
      focusY,
      width * (0.34 + phaseFactor * 0.08)
    );
    focalGradient.addColorStop(0, rgbaFromHex(accent, 0.34 * profileFactor));
    focalGradient.addColorStop(0.56, rgbaFromHex(brass, 0.2 * profileFactor));
    focalGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.context.fillStyle = focalGradient;
    this.context.fillRect(0, 0, width, height);

    const lineCount = Math.round(5 + 10 * phaseFactor * profileFactor);
    const lineStep = height / (lineCount + 1);
    const amplitude = (10 + 24 * phaseFactor) * profileFactor * motionFactor;
    const frequency = 5.6 + phaseFactor * 2.4;

    this.context.lineWidth = Math.max(1, width * 0.0018);
    this.context.globalCompositeOperation = 'screen';

    for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
      const yBase = lineStep * (lineIndex + 1);
      const hueWeight = (lineIndex + 1) / lineCount;
      this.context.strokeStyle =
        lineIndex % 2 === 0
          ? rgbaFromHex(accent, 0.2 + hueWeight * 0.18)
          : rgbaFromHex(brass, 0.16 + hueWeight * 0.14);
      this.context.beginPath();

      const phaseOffset = lineIndex * 0.62 + this.state.pointerX * Math.PI * 1.8;
      for (let x = 0; x <= width; x += Math.max(6, Math.floor(width / 72))) {
        const xRatio = x / width;
        const curve =
          Math.sin(xRatio * frequency + time * (0.9 + hueWeight) + phaseOffset) * amplitude +
          Math.cos(xRatio * (frequency * 0.6) - time * (0.44 + hueWeight * 0.3)) *
            amplitude *
            0.36;
        const pointerBias = (this.state.pointerY - 0.5) * amplitude * 0.7;
        const y = yBase + curve + pointerBias;
        if (x === 0) {
          this.context.moveTo(x, y);
        } else {
          this.context.lineTo(x, y);
        }
      }

      this.context.stroke();
    }

    this.context.globalCompositeOperation = 'source-over';
    this.context.fillStyle = rgbaFromHex(accent, 0.36);
    this.context.beginPath();
    this.context.arc(focusX, focusY, 5 + 9 * phaseFactor * profileFactor, 0, Math.PI * 2);
    this.context.fill();

    this.renderStatus('frame');
    noteComponentLifecycle('spw-shader-field', 'rendered', {
      phase: this.state.phase,
      profile: this.state.profile
    });
  }

  tick(nowMs) {
    const root = document.documentElement;
    const reducedMotion = root.dataset.reducedMotion === 'true';
    const profile = root.dataset.performanceProfile ?? 'field';
    const fps = reducedMotion ? 8 : profileFrameRate(profile);
    const interval = 1000 / fps;

    if (nowMs - this.lastFrameMs >= interval) {
      this.lastFrameMs = nowMs;
      this.drawFrame(nowMs);
    }

    this.frameHandle = requestAnimationFrame((nextNowMs) => {
      this.tick(nextNowMs);
    });
  }
}

export function defineShaderField() {
  if (!customElements.get('spw-shader-field')) {
    customElements.define('spw-shader-field', SpwShaderField);
  }
}
