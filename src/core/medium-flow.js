/**
 * ^intent:
 * ^intent[module]{ id:core.medium-flow mode:spwlang surface:web }
 * ^invariants:
 * ^invariant[form]{ determinism:locked contracts:explicit sidefx:bounded }
 * ^invariant[state]{ mutation:public-api projection:data+aria }
 * ^compose:
 * ^compose[neighbors]{ ingress:imports egress:exports bridge:event+store }
 */

const DEFAULT_STEP_MS = 5200;

function shouldIgnoreKeyEvent(event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }

  return target.getAttribute('contenteditable') === 'true';
}

function listFacets(doc) {
  return Array.from(doc.querySelectorAll('[data-layout-region]'));
}

function pickFacetLabel(node) {
  const region = node.getAttribute('data-layout-region');
  const heading = node.querySelector('h1, h2, h3')?.textContent?.trim();
  return heading || region || 'facet';
}

function wrapIndex(index, size) {
  if (size <= 0) {
    return 0;
  }

  const value = index % size;
  return value >= 0 ? value : value + size;
}

export function installMediumFlow({ app, document: doc, window: win } = {}) {
  if (!app || !doc || !win) {
    return {
      destroy() {},
      setEnabled() {}
    };
  }

  const root = doc.documentElement;
  const facets = listFacets(doc);
  let enabled = app.runtimeConfig?.embedMode !== 'assets-only';
  let playing = enabled;
  let facetIndex = 0;
  let timerId = 0;

  const consoleNode = doc.createElement('div');
  consoleNode.className = 'medium-console';
  consoleNode.setAttribute('data-role', 'medium-console');
  consoleNode.setAttribute('aria-live', 'polite');
  consoleNode.setAttribute(
    'data-structure-label',
    'Medium flow console for facet cadence, play state, and language projection'
  );
  consoleNode.innerHTML = `
    <p class="medium-console__line" data-role="medium-title"></p>
    <p class="medium-console__line medium-console__line--meta" data-role="medium-meta"></p>
  `;
  doc.body.append(consoleNode);

  const titleNode = consoleNode.querySelector('[data-role="medium-title"]');
  const metaNode = consoleNode.querySelector('[data-role="medium-meta"]');

  function syncFacetState(reason = 'init') {
    facets.forEach((node, index) => {
      node.dataset.mediumActive = index === facetIndex ? 'true' : 'false';
      node.dataset.mediumFacet = String(index + 1);
    });

    const activeFacet = facets[facetIndex];
    if (activeFacet) {
      activeFacet.scrollIntoView({
        behavior: root.dataset.reducedMotion === 'true' ? 'auto' : 'smooth',
        block: 'start'
      });
    }

    const label = activeFacet ? pickFacetLabel(activeFacet) : 'none';
    if (titleNode) {
      titleNode.textContent = `^medium[facet]{ index:${facetIndex + 1} label:${label} }`;
    }

    if (metaNode) {
      metaNode.textContent =
        `~medium[state]{ play:${playing} phase:${app.store.getState().phase} reason:${reason} }`;
    }
  }

  function scheduleTick() {
    win.clearTimeout(timerId);
    if (!enabled || !playing) {
      return;
    }

    timerId = win.setTimeout(() => {
      app.store.registerClick('medium:auto');
      facetIndex = wrapIndex(facetIndex + 1, facets.length);
      syncFacetState('tick');
      scheduleTick();
    }, DEFAULT_STEP_MS);
  }

  function shiftFacet(step, reason) {
    facetIndex = wrapIndex(facetIndex + step, facets.length);
    syncFacetState(reason);
  }

  function setPlaying(nextPlaying, reason) {
    playing = Boolean(nextPlaying);
    root.dataset.mediumPlaying = playing ? 'true' : 'false';
    syncFacetState(reason);
    scheduleTick();
  }

  function setEnabled(nextEnabled) {
    enabled = Boolean(nextEnabled);
    root.dataset.mediumMode = enabled ? 'on' : 'off';
    if (!enabled) {
      setPlaying(false, 'disabled');
      return;
    }

    setPlaying(true, 'enabled');
  }

  function onKeydown(event) {
    if (!enabled || shouldIgnoreKeyEvent(event) || event.metaKey || event.ctrlKey) {
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      shiftFacet(-1, 'medium:up');
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      shiftFacet(1, 'medium:down');
      return;
    }

    if (event.key === ' ') {
      event.preventDefault();
      setPlaying(!playing, 'medium:play-toggle');
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      app.store.registerClick('medium:right');
      syncFacetState('medium:next-phase');
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      facetIndex = 0;
      syncFacetState('medium:home');
    }
  }

  win.addEventListener('keydown', onKeydown);
  root.dataset.mediumMode = enabled ? 'on' : 'off';
  root.dataset.mediumPlaying = playing ? 'true' : 'false';
  syncFacetState('init');
  scheduleTick();

  app.marginalia.write('medium', 'Medium flow initialized', {
    enabled,
    facets: facets.length
  });

  return {
    setEnabled,
    destroy() {
      win.removeEventListener('keydown', onKeydown);
      win.clearTimeout(timerId);
      consoleNode.remove();
      facets.forEach((node) => {
        delete node.dataset.mediumActive;
        delete node.dataset.mediumFacet;
      });
      delete root.dataset.mediumMode;
      delete root.dataset.mediumPlaying;
    }
  };
}

