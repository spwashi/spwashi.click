/**
 * Intent:
 * Prototype spw exploratory interaction grammar with clickable braces, swappable operators, and geometric navigation.
 * Invariants:
 * Operator swaps are explicit two-step actions and navigation nodes map to declared document anchors only.
 * How this composes with neighbors:
 * Home route mounts this component; it mutates only local state while delegating page scroll/navigation to anchor targets.
 */

import { noteComponentLifecycle } from '../core/ecology.js';
import { parseSpwForm } from '../core/spwlang-parser.js';

const BRACE_SET = Object.freeze(['<>', '()', '[]', '{}']);
const DEFAULT_OPERATORS = Object.freeze(['?', '~', '@', '&', '*', '^', '!', '=', '%', '#', '.']);
const NODE_MAP = Object.freeze([
  Object.freeze({ id: 'seed', label: '^node[seed]', targetId: 'hero-title' }),
  Object.freeze({ id: 'index', label: '^node[index]', targetId: 'selected-work-title' }),
  Object.freeze({ id: 'modules', label: '^node[modules]', targetId: 'chapter-title' }),
  Object.freeze({ id: 'ecology', label: '^node[ecology]', targetId: 'ecology-title' }),
  Object.freeze({ id: 'atlas', label: '^node[atlas]', targetId: 'seed-atlas-title' }),
  Object.freeze({ id: 'contact', label: '^node[contact]', targetId: 'contact-title' })
]);

function braceTokens(bracePair) {
  if (bracePair.length !== 2) {
    return ['{', '}'];
  }

  return [bracePair.charAt(0), bracePair.charAt(1)];
}

function expressionFromState(state) {
  const [openBrace, closeBrace] = braceTokens(state.bracePair);
  return `${state.activeOperator}crystal[${state.activeNode}]${openBrace} ops: ${state.operators.join('')} ${closeBrace}`;
}

function shouldReduceMotion(doc = globalThis.document) {
  return doc?.documentElement?.dataset?.reducedMotion === 'true';
}

class SpwSyntaxLab extends HTMLElement {
  connectedCallback() {
    this.dataset.component = 'syntax-lab';
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Spw syntax lab');
    this.setAttribute('data-structure-label', 'Exploratory syntax lab with swappable operators and geometric anchor navigation');

    this.state = {
      bracePair: '{}',
      operators: [...DEFAULT_OPERATORS],
      activeOperator: '^',
      pendingSwapIndex: null,
      activeNode: 'seed',
      statusLine: '^status{ ready: pick braces, swap operators, route geometry }'
    };

    this.renderScaffold();
    this.bindEvents();
    this.installStructureObserver();
    this.renderState();

    noteComponentLifecycle('spw-syntax-lab', 'connected', {
      node: this.state.activeNode
    });
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.onClick);
    this.structureObserver?.disconnect();
    noteComponentLifecycle('spw-syntax-lab', 'disconnected', {
      node: this.state.activeNode
    });
  }

  renderScaffold() {
    this.innerHTML = `
      <div class="syntax-lab__panel" data-structure-label="Lab panel with controls, expression output, and radial navigation">
        <header class="syntax-lab__header" data-structure-label="Syntax lab heading for spw-workbench and lore-land exploratory alignment">
          <p class="page-section__eyebrow">^lab[exploratory]</p>
          <h2 class="syntax-lab__title">^north-star{ spw-workbench + lore.land }</h2>
          <p class="syntax-lab__subtitle">^mode{ clickable-braces swappable-operators geometric-navigation }</p>
        </header>

        <div
          class="syntax-lab__controls"
          data-role="controls"
          data-structure-label="Control deck for brace regime, operator field, and parse output"
        >
          <section
            class="syntax-lab__control-group"
            aria-label="Brace controls"
            data-structure-label="Brace controls governing expression envelope tokens"
          >
            <h3 class="syntax-lab__control-title">^brace</h3>
            <div class="syntax-lab__brace-grid" data-role="brace-grid"></div>
          </section>

          <section
            class="syntax-lab__control-group"
            aria-label="Operator controls"
            data-structure-label="Operator controls support two-step swap actions and active operator focus"
          >
            <h3 class="syntax-lab__control-title">^operators</h3>
            <p class="syntax-lab__hint">~hint{ click one operator, then another to swap }</p>
            <div class="syntax-lab__operator-grid" data-role="operator-grid"></div>
          </section>

          <section
            class="syntax-lab__control-group"
            aria-label="Expression output"
            data-structure-label="Expression output with parser validity line for executable copy"
          >
            <h3 class="syntax-lab__control-title">^output</h3>
            <pre class="syntax-lab__output" data-role="expression" aria-live="polite"></pre>
            <p class="syntax-lab__parse-status" data-role="parse-status" aria-live="polite"></p>
          </section>
        </div>

        <nav
          class="syntax-lab__radial"
          aria-label="Geometric navigation"
          data-role="radial-nav"
          data-structure-label="Geometric navigation with anchor-targeted nodes"
        ></nav>
        <p class="syntax-lab__status" data-role="status" aria-live="polite"></p>
      </div>
    `;

    const braceGrid = this.querySelector('[data-role="brace-grid"]');
    for (const bracePair of BRACE_SET) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'syntax-lab__brace-button';
      button.dataset.role = 'brace';
      button.dataset.brace = bracePair;
      button.textContent = bracePair;
      braceGrid.append(button);
    }

    const operatorGrid = this.querySelector('[data-role="operator-grid"]');
    for (const operatorSymbol of DEFAULT_OPERATORS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'syntax-lab__operator-button';
      button.dataset.role = 'operator';
      button.dataset.operator = operatorSymbol;
      button.textContent = operatorSymbol;
      operatorGrid.append(button);
    }

    const radialNav = this.querySelector('[data-role="radial-nav"]');
    NODE_MAP.forEach((node, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'syntax-lab__nav-node';
      button.dataset.role = 'node';
      button.dataset.nodeId = node.id;
      button.dataset.targetId = node.targetId;
      button.style.setProperty('--slot', String(index));
      button.textContent = node.label;
      radialNav.append(button);
    });
  }

  bindEvents() {
    this.onClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const button = target.closest('button[data-role]');
      if (!button) {
        return;
      }

      const role = button.dataset.role;
      if (role === 'brace') {
        this.handleBrace(button.dataset.brace);
        return;
      }

      if (role === 'operator') {
        this.handleOperator(button.dataset.operator);
        return;
      }

      if (role === 'node') {
        this.handleNode(button.dataset.nodeId, button.dataset.targetId);
      }
    };

    this.addEventListener('click', this.onClick);
  }

  installStructureObserver() {
    if (typeof MutationObserver !== 'function') {
      return;
    }

    this.structureObserver = new MutationObserver(() => {
      this.syncStructureLabels();
    });

    this.structureObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-llm-readable-structure']
    });
  }

  syncStructureLabels() {
    const structureEnabled = document.documentElement.dataset.llmReadableStructure === 'true';
    const nodes = this.querySelectorAll('[data-structure-label]');

    for (const node of nodes) {
      const label = node.getAttribute('data-structure-label');
      node.setAttribute('data-structure-active', structureEnabled ? 'true' : 'false');

      if (structureEnabled && label) {
        node.setAttribute('aria-description', label);
      } else {
        node.removeAttribute('aria-description');
      }
    }
  }

  setStatus(statusLine) {
    this.state.statusLine = statusLine;
  }

  handleBrace(nextBrace) {
    if (!BRACE_SET.includes(nextBrace)) {
      return;
    }

    this.state.bracePair = nextBrace;
    this.setStatus(`^brace{ active: ${nextBrace} }`);
    this.renderState();
  }

  handleOperator(operatorSymbol) {
    const nextIndex = this.state.operators.indexOf(operatorSymbol);
    if (nextIndex === -1) {
      return;
    }

    if (this.state.pendingSwapIndex === null) {
      this.state.pendingSwapIndex = nextIndex;
      this.state.activeOperator = operatorSymbol;
      this.setStatus(`^operator{ selected: ${operatorSymbol} step: 1/2 }`);
      this.renderState();
      return;
    }

    const firstIndex = this.state.pendingSwapIndex;
    const swapped = [...this.state.operators];
    const temp = swapped[firstIndex];
    swapped[firstIndex] = swapped[nextIndex];
    swapped[nextIndex] = temp;

    this.state.operators = swapped;
    this.state.pendingSwapIndex = null;
    this.state.activeOperator = operatorSymbol;
    this.setStatus(`^operator{ swap: complete active: ${operatorSymbol} }`);
    this.renderState();
  }

  handleNode(nodeId, targetId) {
    const knownNode = NODE_MAP.find((node) => node.id === nodeId);
    if (!knownNode) {
      return;
    }

    this.state.activeNode = nodeId;

    const target = targetId ? document.getElementById(targetId) : null;
    if (target) {
      target.scrollIntoView({
        behavior: shouldReduceMotion(document) ? 'auto' : 'smooth',
        block: 'start'
      });
    }

    this.setStatus(`^navigate{ node: ${nodeId} target: #${targetId} }`);
    this.renderState();
  }

  renderState() {
    this.dataset.activeNode = this.state.activeNode;
    this.dataset.activeOperator = this.state.activeOperator;
    this.dataset.bracePair = this.state.bracePair;
    this.dataset.pendingSwap = this.state.pendingSwapIndex === null
      ? 'none'
      : String(this.state.pendingSwapIndex);

    const braceButtons = this.querySelectorAll('[data-role="brace"]');
    for (const button of braceButtons) {
      const active = button.dataset.brace === this.state.bracePair;
      button.setAttribute('data-active', active ? 'true' : 'false');
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    const operatorButtons = this.querySelectorAll('[data-role="operator"]');
    for (const button of operatorButtons) {
      const index = this.state.operators.indexOf(button.dataset.operator);
      const isPending = index === this.state.pendingSwapIndex;
      const isActive = button.dataset.operator === this.state.activeOperator;

      button.setAttribute('data-order', String(index));
      button.setAttribute('data-active', isActive ? 'true' : 'false');
      button.setAttribute('data-pending', isPending ? 'true' : 'false');
      button.style.setProperty('--operator-order', String(index));
    }

    const navButtons = this.querySelectorAll('[data-role="node"]');
    for (const button of navButtons) {
      const active = button.dataset.nodeId === this.state.activeNode;
      button.setAttribute('data-active', active ? 'true' : 'false');
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    const expressionNode = this.querySelector('[data-role="expression"]');
    const parseStatusNode = this.querySelector('[data-role="parse-status"]');
    const statusNode = this.querySelector('[data-role="status"]');
    const expression = expressionFromState(this.state);
    const parseResult = parseSpwForm(expression);
    const parseIsValid = Boolean(parseResult.ok);

    this.dataset.expressionValid = parseIsValid ? 'true' : 'false';
    expressionNode.textContent = expression;
    expressionNode.dataset.parse = parseIsValid ? 'valid' : 'invalid';

    parseStatusNode.textContent = parseIsValid
      ? '^parse{ status: ok mode: executable-copy }'
      : `!parse{ status: fail reason: ${parseResult.reason ?? 'unknown'} }`;
    parseStatusNode.dataset.parse = parseIsValid ? 'valid' : 'invalid';
    statusNode.textContent = this.state.statusLine;

    this.syncStructureLabels();

    noteComponentLifecycle('spw-syntax-lab', 'rendered', {
      node: this.state.activeNode,
      operator: this.state.activeOperator,
      brace: this.state.bracePair,
      parse: parseIsValid ? 'ok' : 'fail'
    });
  }
}

export function defineSyntaxLab() {
  if (!customElements.get('spw-syntax-lab')) {
    customElements.define('spw-syntax-lab', SpwSyntaxLab);
  }
}
