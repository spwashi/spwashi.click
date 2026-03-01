/**
 * Intent:
 * Render a compact SVG rhythm field that makes interaction intensity visible without textual explanation.
 * Invariants:
 * Intensity is constrained to 0..3 and maps to deterministic active cell counts.
 * How this composes with neighbors:
 * Click-stage updates the intensity attribute and CSS animates active SVG cells via data-state hooks.
 */

import { noteComponentLifecycle } from '../core/ecology.js';

function clampIntensity(value) {
  const parsed = Number.parseInt(value ?? '0', 10);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.min(3, Math.max(0, parsed));
}

function activeCellCountForIntensity(intensity) {
  return (intensity + 1) * 9;
}

class SpwRhythmGrid extends HTMLElement {
  static observedAttributes = ['intensity'];

  connectedCallback() {
    this.dataset.component = 'rhythm-grid';
    this.setAttribute('role', 'img');
    this.setAttribute('aria-label', 'Rhythm intensity visualization');
    noteComponentLifecycle('spw-rhythm-grid', 'connected', {
      intensity: this.getAttribute('intensity') ?? '0'
    });
    this.renderStructure();
    this.render();
  }

  disconnectedCallback() {
    noteComponentLifecycle('spw-rhythm-grid', 'disconnected', {
      intensity: this.getAttribute('intensity') ?? '0'
    });
  }

  attributeChangedCallback(name) {
    if (name === 'intensity' && this.isConnected) {
      this.render();
    }
  }

  renderStructure() {
    if (this.querySelector('svg')) {
      return;
    }

    const namespace = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(namespace, 'svg');
    svg.setAttribute('viewBox', '0 0 180 180');
    svg.setAttribute('class', 'rhythm-grid__svg');
    svg.setAttribute('aria-hidden', 'true');

    let index = 0;
    for (let row = 0; row < 6; row += 1) {
      for (let column = 0; column < 6; column += 1) {
        const rect = document.createElementNS(namespace, 'rect');
        rect.setAttribute('x', String(6 + column * 29));
        rect.setAttribute('y', String(6 + row * 29));
        rect.setAttribute('width', '22');
        rect.setAttribute('height', '22');
        rect.setAttribute('rx', '4');
        rect.setAttribute('data-cell-index', String(index));
        rect.style.setProperty('--cell-delay', `${(row + column) * 40}ms`);
        svg.append(rect);
        index += 1;
      }
    }

    this.append(svg);
  }

  render() {
    const intensity = clampIntensity(this.getAttribute('intensity'));
    const activeCellCount = activeCellCountForIntensity(intensity);
    this.dataset.intensity = String(intensity);
    this.style.setProperty('--rhythm-intensity', String(intensity));

    const cells = this.querySelectorAll('[data-cell-index]');
    for (const cell of cells) {
      const cellIndex = Number.parseInt(cell.getAttribute('data-cell-index') ?? '0', 10);
      const isActive = cellIndex < activeCellCount;
      cell.setAttribute('data-active', isActive ? 'true' : 'false');
    }

    noteComponentLifecycle('spw-rhythm-grid', 'rendered', {
      intensity,
      activeCellCount
    });
  }
}

export function defineRhythmGrid() {
  if (!customElements.get('spw-rhythm-grid')) {
    customElements.define('spw-rhythm-grid', SpwRhythmGrid);
  }
}
