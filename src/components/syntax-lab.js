/**
 * ^intent:
 * ^intent[module]{ id:components.syntax-lab mode:spwlang surface:web }
 * ^invariants:
 * ^invariant[form]{ determinism:locked contracts:explicit sidefx:bounded }
 * ^invariant[state]{ mutation:public-api projection:data+aria }
 * ^compose:
 * ^compose[neighbors]{ ingress:imports egress:exports bridge:event+store }
 */

import { noteComponentLifecycle } from '../core/ecology.js';
import { parseSpwForm } from '../core/spwlang-parser.js';
import { installSporadicSpaceSampler } from '../core/space-metrics.js';

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

const NODE_LOOKUP = Object.freeze(
  Object.fromEntries(NODE_MAP.map((node, index) => [node.id, Object.freeze({ ...node, index })]))
);

const FACET_COORDINATES = Object.freeze({
  seed: Object.freeze([60, 18]),
  index: Object.freeze([106, 46]),
  modules: Object.freeze([106, 94]),
  ecology: Object.freeze([60, 122]),
  atlas: Object.freeze([14, 94]),
  contact: Object.freeze([14, 46])
});

const FACET_EDGES = Object.freeze([
  Object.freeze(['seed', 'index']),
  Object.freeze(['index', 'modules']),
  Object.freeze(['modules', 'ecology']),
  Object.freeze(['ecology', 'atlas']),
  Object.freeze(['atlas', 'contact']),
  Object.freeze(['contact', 'seed']),
  Object.freeze(['seed', 'modules']),
  Object.freeze(['index', 'ecology']),
  Object.freeze(['modules', 'atlas']),
  Object.freeze(['ecology', 'contact']),
  Object.freeze(['atlas', 'seed']),
  Object.freeze(['contact', 'index'])
]);

const OPERATOR_TRANSFORMS = Object.freeze({
  '?': Object.freeze({ shift: 1, mirror: false }),
  '~': Object.freeze({ shift: -1, mirror: false }),
  '@': Object.freeze({ shift: 2, mirror: false }),
  '&': Object.freeze({ shift: 1, mirror: true }),
  '*': Object.freeze({ shift: 3, mirror: false }),
  '^': Object.freeze({ shift: 2, mirror: true }),
  '!': Object.freeze({ shift: -2, mirror: false }),
  '=': Object.freeze({ shift: 0, mirror: true }),
  '%': Object.freeze({ shift: 4, mirror: false }),
  '#': Object.freeze({ shift: -3, mirror: true }),
  '.': Object.freeze({ shift: 0, mirror: false })
});

const BRACE_LAYOUT_VIEW = Object.freeze({
  '{}': 'flow',
  '[]': 'grid',
  '()': 'focus',
  '<>': 'stack'
});

const BRACE_NAV_STEP = Object.freeze({
  '{}': 0,
  '[]': 2,
  '()': -1,
  '<>': 1
});

const COMPONENT_VIEW_MODES = Object.freeze(['native', 'wire', 'lumen', 'quiet']);

function wrapIndex(index, total) {
  if (total <= 0) {
    return 0;
  }

  const wrapped = index % total;
  return wrapped >= 0 ? wrapped : wrapped + total;
}

function rotateArray(values, direction) {
  const total = values.length;
  if (total <= 1) {
    return [...values];
  }

  const shift = wrapIndex(direction, total);
  if (shift === 0) {
    return [...values];
  }

  return [...values.slice(total - shift), ...values.slice(0, total - shift)];
}

function braceTokens(bracePair) {
  if (bracePair.length !== 2) {
    return ['{', '}'];
  }

  return [bracePair.charAt(0), bracePair.charAt(1)];
}

function layoutViewFromBrace(bracePair) {
  return BRACE_LAYOUT_VIEW[bracePair] ?? BRACE_LAYOUT_VIEW['{}'];
}

function componentViewFromState(state) {
  const operatorIndex = Math.max(0, state.operators.indexOf(state.activeOperator));
  return COMPONENT_VIEW_MODES[operatorIndex % COMPONENT_VIEW_MODES.length];
}

function shouldReduceMotion(doc = globalThis.document) {
  return doc?.documentElement?.dataset?.reducedMotion === 'true';
}

function operatorRule(operatorSymbol) {
  return OPERATOR_TRANSFORMS[operatorSymbol] ?? OPERATOR_TRANSFORMS['.'];
}

function resolveFacetNode(nodeId, state) {
  const sourceNode = NODE_LOOKUP[nodeId];
  if (!sourceNode) {
    return NODE_LOOKUP.seed;
  }

  const activeOperator = state.activeOperator;
  const rule = operatorRule(activeOperator);
  const operatorRank = Math.max(0, state.operators.indexOf(activeOperator));
  const rankShift = operatorRank % NODE_MAP.length;

  let nextIndex = wrapIndex(sourceNode.index + rule.shift + rankShift, NODE_MAP.length);

  if (rule.mirror) {
    nextIndex = NODE_MAP.length - 1 - nextIndex;
  }

  const resolvedNode = NODE_MAP[nextIndex];
  return NODE_LOOKUP[resolvedNode.id] ?? sourceNode;
}

function expressionFromState(state) {
  const [openBrace, closeBrace] = braceTokens(state.bracePair);
  return `${state.activeOperator}facet[${state.activeNode}]${openBrace} weave:${state.operators.join('')} turn:${state.lastTurn} ${closeBrace}`;
}

function facetPolygonPoints([centerX, centerY], radius = 11) {
  const top = `${centerX},${centerY - radius}`;
  const right = `${centerX + radius},${centerY}`;
  const bottom = `${centerX},${centerY + radius}`;
  const left = `${centerX - radius},${centerY}`;
  return `${top} ${right} ${bottom} ${left}`;
}

function createSvgNode(tagName) {
  return document.createElementNS('http://www.w3.org/2000/svg', tagName);
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

class SpwSyntaxLab extends HTMLElement {
  connectedCallback() {
    this.dataset.component = 'syntax-lab';
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Spw syntax lab');
    this.setAttribute(
      'aria-keyshortcuts',
      'Alt+ArrowLeft Alt+ArrowRight ArrowUp ArrowDown ArrowLeft ArrowRight Home End'
    );
    this.setAttribute('data-structure-label', 'Exploratory syntax lab with swappable operators and geometric facet navigation');
    this.tabIndex = 0;

    this.state = {
      bracePair: '{}',
      operators: [...DEFAULT_OPERATORS],
      activeOperator: '^',
      pendingSwapIndex: null,
      activeNode: 'seed',
      lastTurn: 'seed>seed',
      statusLine: '^facet{ mode: native-spw pick: brace+operator+facet }'
    };

    this.renderScaffold();
    this.bindEvents();
    this.installStructureObserver();
    this.installSpaceSampler();
    this.renderState();

    noteComponentLifecycle('spw-syntax-lab', 'connected', {
      node: this.state.activeNode
    });
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('keydown', this.onKeydown);
    this.structureObserver?.disconnect();
    this.cleanupSpaceSampler?.();
    this.cleanupSpaceSampler = null;
    noteComponentLifecycle('spw-syntax-lab', 'disconnected', {
      node: this.state.activeNode
    });
  }

  renderScaffold() {
    this.innerHTML = `
      <div class="syntax-lab__panel" data-structure-label="Lab panel with controls, executable output, and facet graph navigation">
        <header class="syntax-lab__header" data-structure-label="Syntax lab heading for spw-workbench and lore-land exploratory alignment">
          <p class="page-section__eyebrow">^lab[exploratory]</p>
          <h2 class="syntax-lab__title">^north-star{ spw-workbench + lore.land }</h2>
          <p class="syntax-lab__subtitle">^mode{ facet-nav + brace-regime + operator-swap }</p>
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
            <p class="syntax-lab__hint">~hint{ click:swap keyboard:arrow-nav alt+left/right:rotate symbol-keys:focus-op }</p>
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
          data-structure-label="Facet graph navigation with operator-based combinatoric node resolution"
        ></nav>

        <p class="syntax-lab__facet-map" data-role="facet-map" aria-live="polite"></p>
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
    const graph = this.buildFacetGraph();
    radialNav.append(graph);

    NODE_MAP.forEach((node, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'syntax-lab__nav-node';
      button.dataset.role = 'node';
      button.dataset.nodeId = node.id;
      button.style.setProperty('--slot', String(index));
      button.textContent = node.label;
      radialNav.append(button);
    });

    this.refs = Object.freeze({
      braceButtons: Object.freeze(Array.from(this.querySelectorAll('[data-role="brace"]'))),
      operatorButtons: Object.freeze(Array.from(this.querySelectorAll('[data-role="operator"]'))),
      navButtons: Object.freeze(Array.from(this.querySelectorAll('[data-role="node"]'))),
      facetPolygons: Object.freeze(
        Array.from(this.querySelectorAll('.syntax-lab__facet-face[data-facet-id]'))
      ),
      expressionNode: this.querySelector('[data-role="expression"]'),
      parseStatusNode: this.querySelector('[data-role="parse-status"]'),
      facetMapNode: this.querySelector('[data-role="facet-map"]'),
      statusNode: this.querySelector('[data-role="status"]')
    });
    this.structureNodes = Object.freeze(Array.from(this.querySelectorAll('[data-structure-label]')));
  }

  buildFacetGraph() {
    const graph = createSvgNode('svg');
    graph.classList.add('syntax-lab__facet-graph');
    graph.setAttribute('viewBox', '0 0 120 140');
    graph.setAttribute('aria-hidden', 'true');

    const edgeGroup = createSvgNode('g');
    edgeGroup.classList.add('syntax-lab__facet-edges');

    for (const [fromId, toId] of FACET_EDGES) {
      const from = FACET_COORDINATES[fromId];
      const to = FACET_COORDINATES[toId];
      if (!from || !to) {
        continue;
      }

      const line = createSvgNode('line');
      line.setAttribute('x1', String(from[0]));
      line.setAttribute('y1', String(from[1]));
      line.setAttribute('x2', String(to[0]));
      line.setAttribute('y2', String(to[1]));
      line.dataset.edge = `${fromId}:${toId}`;
      edgeGroup.append(line);
    }

    graph.append(edgeGroup);

    const faceGroup = createSvgNode('g');
    faceGroup.classList.add('syntax-lab__facet-faces');

    for (const node of NODE_MAP) {
      const center = FACET_COORDINATES[node.id];
      if (!center) {
        continue;
      }

      const polygon = createSvgNode('polygon');
      polygon.setAttribute('points', facetPolygonPoints(center));
      polygon.dataset.facetId = node.id;
      polygon.classList.add('syntax-lab__facet-face');
      faceGroup.append(polygon);
    }

    graph.append(faceGroup);
    return graph;
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
        this.handleNode(button.dataset.nodeId);
      }
    };

    this.onKeydown = (event) => {
      const target = event.target;
      if (isTextEntryTarget(target)) {
        return;
      }

      const button = target instanceof Element ? target.closest('button[data-role]') : null;
      if (button && this.handleButtonKeyboard(event, button)) {
        return;
      }

      this.handleShortcutKeyboard(event);
    };

    this.addEventListener('click', this.onClick);
    this.addEventListener('keydown', this.onKeydown);
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
    const nodes = this.structureNodes ?? this.querySelectorAll('[data-structure-label]');

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

  installSpaceSampler() {
    this.cleanupSpaceSampler?.();
    this.cleanupSpaceSampler = installSporadicSpaceSampler({
      node: this,
      intervalMs: 2600,
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
    this.style.setProperty('--syntax-inline-size', `${metrics.width}px`);
    this.style.setProperty('--syntax-block-size', `${metrics.height}px`);

    const controlColumns = metrics.width >= 1060 ? 3 : metrics.width >= 760 ? 2 : 1;
    this.style.setProperty('--syntax-control-columns', String(controlColumns));
  }

  setStatus(statusLine) {
    this.state.statusLine = statusLine;
  }

  navigateToNode(nextNodeId, reasonLabel = 'direct') {
    const sourceId = this.state.activeNode;
    const sourceNode = NODE_LOOKUP[sourceId] ?? NODE_LOOKUP.seed;
    const resolvedNode = NODE_LOOKUP[nextNodeId] ?? sourceNode;

    this.state.activeNode = resolvedNode.id;
    this.state.lastTurn = `${sourceNode.id}>${resolvedNode.id}`;

    const target = resolvedNode.targetId ? document.getElementById(resolvedNode.targetId) : null;
    if (target) {
      target.scrollIntoView({
        behavior: shouldReduceMotion(document) ? 'auto' : 'smooth',
        block: 'start'
      });
    }

    this.setStatus(
      `^navigate{ reason:${reasonLabel} from:${sourceNode.id} to:${resolvedNode.id} target:#${resolvedNode.targetId} }`
    );
  }

  navigateByBrace(bracePair) {
    const step = BRACE_NAV_STEP[bracePair] ?? 0;
    const sourceNode = NODE_LOOKUP[this.state.activeNode] ?? NODE_LOOKUP.seed;

    if (step === 0) {
      this.navigateToNode('seed', `brace:${bracePair}`);
      return;
    }

    const nextIndex = wrapIndex(sourceNode.index + step, NODE_MAP.length);
    const nextNode = NODE_MAP[nextIndex];
    this.navigateToNode(nextNode.id, `brace:${bracePair}`);
  }

  applyViewModes() {
    const layoutView = layoutViewFromBrace(this.state.bracePair);
    const componentView = componentViewFromState(this.state);
    const root = document.documentElement;

    this.dataset.layoutView = layoutView;
    this.dataset.componentView = componentView;
    root.dataset.spwLayoutView = layoutView;
    root.dataset.spwComponentView = componentView;
  }

  handleBrace(nextBrace) {
    if (!BRACE_SET.includes(nextBrace)) {
      return;
    }

    this.state.bracePair = nextBrace;
    this.navigateByBrace(nextBrace);
    this.setStatus(
      `^brace-nav{ active:${nextBrace} layout:${layoutViewFromBrace(nextBrace)} turn:${this.state.lastTurn} }`
    );
    this.renderState();
  }

  stepBrace(step = 1) {
    const currentIndex = Math.max(0, BRACE_SET.indexOf(this.state.bracePair));
    const nextIndex = wrapIndex(currentIndex + step, BRACE_SET.length);
    const nextBrace = BRACE_SET[nextIndex];
    this.handleBrace(nextBrace);
  }

  activateOperator(operatorSymbol, reasonLabel = 'direct') {
    if (!this.state.operators.includes(operatorSymbol)) {
      return;
    }

    this.state.pendingSwapIndex = null;
    this.state.activeOperator = operatorSymbol;
    this.setStatus(`^operator-focus{ active:${operatorSymbol} reason:${reasonLabel} }`);
    this.renderState();
  }

  rotateOperators(direction = 1, reasonLabel = 'rotate') {
    const normalizedDirection = direction >= 0 ? 1 : -1;
    this.state.operators = rotateArray(this.state.operators, normalizedDirection);
    this.state.pendingSwapIndex = null;

    if (!this.state.operators.includes(this.state.activeOperator)) {
      this.state.activeOperator = this.state.operators[0];
    }

    const componentView = componentViewFromState(this.state);
    this.setStatus(
      `^operator-rotate{ active:${this.state.activeOperator} direction:${normalizedDirection > 0 ? 'cw' : 'ccw'} component-view:${componentView} reason:${reasonLabel} }`
    );
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
      this.setStatus(`^operator{ selected: ${operatorSymbol} step: 1/2 mode: swap }`);
      this.renderState();
      return;
    }

    const firstIndex = this.state.pendingSwapIndex;

    if (firstIndex === nextIndex) {
      const rotationDirection = operatorRule(operatorSymbol).shift >= 0 ? 1 : -1;
      this.state.activeOperator = operatorSymbol;
      this.rotateOperators(rotationDirection, 'pointer:same-symbol');
      return;
    }

    const swapped = [...this.state.operators];
    const temp = swapped[firstIndex];
    swapped[firstIndex] = swapped[nextIndex];
    swapped[nextIndex] = temp;

    this.state.operators = swapped;
    this.state.pendingSwapIndex = null;
    this.state.activeOperator = operatorSymbol;
    this.setStatus(`^operator{ swap: complete active: ${operatorSymbol} weave: ${this.state.operators.join('')} }`);
    this.renderState();
  }

  handleNode(nodeId, reasonLabel = null) {
    if (!NODE_LOOKUP[nodeId]) {
      return;
    }

    const resolvedNode = resolveFacetNode(nodeId, this.state);
    const reason = reasonLabel ?? `operator:${this.state.activeOperator}:pick:${nodeId}`;
    this.navigateToNode(resolvedNode.id, reason);
    this.setStatus(`^facet-turn{ pick:${nodeId} op:${this.state.activeOperator} resolve:${resolvedNode.id} }`);
    this.renderState();
  }

  stepNode(step = 1, reasonLabel = 'facet:step') {
    const sourceNode = NODE_LOOKUP[this.state.activeNode] ?? NODE_LOOKUP.seed;
    const nextIndex = wrapIndex(sourceNode.index + step, NODE_MAP.length);
    const candidateNode = NODE_MAP[nextIndex];
    this.handleNode(candidateNode.id, reasonLabel);
  }

  focusButtonByIndex(buttons, nextIndex) {
    if (!Array.isArray(buttons) || buttons.length === 0) {
      return null;
    }

    const safeIndex = wrapIndex(nextIndex, buttons.length);
    const nextButton = buttons[safeIndex] ?? null;
    nextButton?.focus();
    return nextButton;
  }

  handleButtonKeyboard(event, button) {
    const role = button.dataset.role;
    if (!role) {
      return false;
    }

    if (role === 'brace') {
      const buttons = this.refs?.braceButtons ?? [];
      const index = buttons.indexOf(button);
      let nextIndex = null;

      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = index - 1;
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = index + 1;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = buttons.length - 1;
      }

      if (nextIndex === null) {
        return false;
      }

      event.preventDefault();
      const nextButton = this.focusButtonByIndex(buttons, nextIndex);
      const nextBrace = nextButton?.dataset.brace;
      if (nextBrace) {
        this.handleBrace(nextBrace);
      }
      return true;
    }

    if (role === 'operator') {
      const buttons = this.refs?.operatorButtons ?? [];
      const index = buttons.indexOf(button);
      let nextIndex = null;

      if (event.key === 'ArrowLeft') {
        nextIndex = index - 1;
      } else if (event.key === 'ArrowRight') {
        nextIndex = index + 1;
      } else if (event.key === 'ArrowUp') {
        nextIndex = index - 6;
      } else if (event.key === 'ArrowDown') {
        nextIndex = index + 6;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = buttons.length - 1;
      }

      if (nextIndex === null) {
        return false;
      }

      event.preventDefault();
      const nextButton = this.focusButtonByIndex(buttons, nextIndex);
      const nextOperator = nextButton?.dataset.operator;
      if (nextOperator) {
        this.activateOperator(nextOperator, 'keyboard:operator-grid');
      }
      return true;
    }

    if (role === 'node') {
      const buttons = this.refs?.navButtons ?? [];
      const index = buttons.indexOf(button);
      let nextIndex = null;

      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = index - 1;
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = index + 1;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = buttons.length - 1;
      }

      if (nextIndex === null) {
        return false;
      }

      event.preventDefault();
      const nextButton = this.focusButtonByIndex(buttons, nextIndex);
      const nextNodeId = nextButton?.dataset.nodeId;
      if (nextNodeId) {
        this.handleNode(nextNodeId, 'keyboard:node-grid');
      }
      return true;
    }

    return false;
  }

  handleShortcutKeyboard(event) {
    if (event.metaKey || event.ctrlKey) {
      return false;
    }

    if (event.altKey && event.key === 'ArrowLeft') {
      event.preventDefault();
      this.rotateOperators(-1, 'keyboard:alt-arrow');
      return true;
    }

    if (event.altKey && event.key === 'ArrowRight') {
      event.preventDefault();
      this.rotateOperators(1, 'keyboard:alt-arrow');
      return true;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.stepNode(-1, 'keyboard:arrow');
      return true;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.stepNode(1, 'keyboard:arrow');
      return true;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.stepBrace(-1);
      return true;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.stepBrace(1);
      return true;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      this.navigateToNode('seed', 'keyboard:home');
      this.renderState();
      return true;
    }

    if (event.key === 'End') {
      event.preventDefault();
      this.navigateToNode('contact', 'keyboard:end');
      this.renderState();
      return true;
    }

    const braceByShortcut = {
      '{': '{}',
      '}': '{}',
      '[': '[]',
      ']': '[]',
      '(': '()',
      ')': '()',
      '<': '<>',
      '>': '<>'
    };

    const bracePair = braceByShortcut[event.key];
    if (bracePair) {
      event.preventDefault();
      this.handleBrace(bracePair);
      return true;
    }

    if (DEFAULT_OPERATORS.includes(event.key)) {
      event.preventDefault();
      this.activateOperator(event.key, 'keyboard:symbol');
      return true;
    }

    return false;
  }

  applyFacetLighting() {
    const nodeIndex = NODE_LOOKUP[this.state.activeNode]?.index ?? 0;
    const operatorIndex = Math.max(0, this.state.operators.indexOf(this.state.activeOperator));
    const lumAngle = 104 + nodeIndex * 60 + operatorIndex * 9;
    const lumPower = Math.min(1.2, 0.45 + operatorIndex / 14).toFixed(3);

    this.style.setProperty('--facet-angle', `${lumAngle}deg`);
    this.style.setProperty('--facet-glow', lumPower);
    this.style.setProperty('--facet-node-index', String(nodeIndex));
    this.style.setProperty('--facet-operator-index', String(operatorIndex));
  }

  renderState() {
    this.dataset.activeNode = this.state.activeNode;
    this.dataset.activeOperator = this.state.activeOperator;
    this.dataset.bracePair = this.state.bracePair;
    this.dataset.pendingSwap = this.state.pendingSwapIndex === null
      ? 'none'
      : String(this.state.pendingSwapIndex);

    const braceButtons = this.refs?.braceButtons ?? this.querySelectorAll('[data-role="brace"]');
    for (const button of braceButtons) {
      const active = button.dataset.brace === this.state.bracePair;
      button.setAttribute('data-active', active ? 'true' : 'false');
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    const operatorButtons =
      this.refs?.operatorButtons ?? this.querySelectorAll('[data-role="operator"]');
    for (const button of operatorButtons) {
      const index = this.state.operators.indexOf(button.dataset.operator);
      const isPending = index === this.state.pendingSwapIndex;
      const isActive = button.dataset.operator === this.state.activeOperator;

      button.setAttribute('data-order', String(index));
      button.setAttribute('data-active', isActive ? 'true' : 'false');
      button.setAttribute('data-pending', isPending ? 'true' : 'false');
      button.style.setProperty('--operator-order', String(index));
    }

    const resolvedNodeBySource = Object.fromEntries(
      NODE_MAP.map((node) => [node.id, resolveFacetNode(node.id, this.state)])
    );

    const navButtons = this.refs?.navButtons ?? this.querySelectorAll('[data-role="node"]');
    for (const button of navButtons) {
      const sourceNodeId = button.dataset.nodeId;
      const resolvedNode = resolvedNodeBySource[sourceNodeId] ?? NODE_LOOKUP.seed;
      const isResolvedActive = resolvedNode.id === this.state.activeNode;
      const isOriginActive = sourceNodeId === this.state.activeNode;

      button.dataset.resolvedNode = resolvedNode.id;
      button.setAttribute('data-active', isResolvedActive ? 'true' : 'false');
      button.setAttribute('data-origin', isOriginActive ? 'true' : 'false');
      button.setAttribute('aria-pressed', isResolvedActive ? 'true' : 'false');
      button.setAttribute(
        'aria-label',
        `Facet ${sourceNodeId} mapped by operator ${this.state.activeOperator} resolves to ${resolvedNode.id}`
      );
      button.setAttribute('title', `${sourceNodeId} -> ${resolvedNode.id}`);
    }

    const facetPolygons =
      this.refs?.facetPolygons ??
      this.querySelectorAll('.syntax-lab__facet-face[data-facet-id]');
    for (const polygon of facetPolygons) {
      const facetId = polygon.dataset.facetId;
      const active = facetId === this.state.activeNode;
      polygon.setAttribute('data-active', active ? 'true' : 'false');
    }

    const expressionNode =
      this.refs?.expressionNode ?? this.querySelector('[data-role="expression"]');
    const parseStatusNode =
      this.refs?.parseStatusNode ?? this.querySelector('[data-role="parse-status"]');
    const facetMapNode = this.refs?.facetMapNode ?? this.querySelector('[data-role="facet-map"]');
    const statusNode = this.refs?.statusNode ?? this.querySelector('[data-role="status"]');
    const expression = expressionFromState(this.state);
    const parseResult = parseSpwForm(expression);
    const parseIsValid = Boolean(parseResult.ok);
    const layoutView = layoutViewFromBrace(this.state.bracePair);
    const componentView = componentViewFromState(this.state);

    this.dataset.expressionValid = parseIsValid ? 'true' : 'false';
    expressionNode.textContent = expression;
    expressionNode.dataset.parse = parseIsValid ? 'valid' : 'invalid';

    parseStatusNode.textContent = parseIsValid
      ? '^parse[ok]{ form: executable-copy channel: spw }'
      : `!parse[fail]{ reason: ${parseResult.reason ?? 'unknown'} }`;
    parseStatusNode.dataset.parse = parseIsValid ? 'valid' : 'invalid';

    const facetMap = NODE_MAP
      .map((node) => `${node.id}>${(resolvedNodeBySource[node.id] ?? NODE_LOOKUP.seed).id}`)
      .join(' ');
    facetMapNode.textContent = `^view-map{ layout:${layoutView} components:${componentView} facets:${facetMap} }`;
    statusNode.textContent = this.state.statusLine;

    this.applyFacetLighting();
    this.applyViewModes();
    this.syncStructureLabels();

    noteComponentLifecycle('spw-syntax-lab', 'rendered', {
      node: this.state.activeNode,
      operator: this.state.activeOperator,
      brace: this.state.bracePair,
      parse: parseIsValid ? 'ok' : 'fail',
      turn: this.state.lastTurn
    });
  }
}

export function defineSyntaxLab() {
  if (!customElements.get('spw-syntax-lab')) {
    customElements.define('spw-syntax-lab', SpwSyntaxLab);
  }
}
