import { installSporadicSpaceSampler } from '../../../src/core/runtime/js/space-metrics.js';

const PHASE_SEQUENCE = Object.freeze(['seed', 'pulse', 'counterpoint', 'chorus']);

const PHASE_GRAMMAR = Object.freeze({
  seed: Object.freeze({ operator: '^', brace: '{}' }),
  pulse: Object.freeze({ operator: '~', brace: '[]' }),
  counterpoint: Object.freeze({ operator: '@', brace: '()' }),
  chorus: Object.freeze({ operator: '!', brace: '<>' })
});

function humanLabelFromImagePath(imagePath) {
  const filename = imagePath.split('/').at(-1) ?? '';
  const withoutExt = filename.replace(/\.[a-z0-9]+$/i, '');
  const withoutPrefix = withoutExt.replace(/^spwashi_/, '');
  const withoutUuid = withoutPrefix.replace(/_[0-9a-f-]{36}$/i, '');
  const words = withoutUuid.split('_').filter(Boolean);

  if (words.length === 0) {
    return 'Untitled seed';
  }

  return words
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function slug(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function appendVersion(url, assetVersion) {
  if (!assetVersion) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${encodeURIComponent(assetVersion)}`;
}

function resolveIndex(images, clickCount) {
  if (images.length === 0) {
    return -1;
  }

  return clickCount % images.length;
}

function clickCountForIndex(images, clickCount, requestedIndex) {
  const currentIndex = resolveIndex(images, clickCount);
  if (currentIndex < 0) {
    return 0;
  }

  let nextClickCount = clickCount - currentIndex + requestedIndex;
  while (nextClickCount < 0) {
    nextClickCount += images.length;
  }

  return nextClickCount;
}

function phaseGrammar(phaseName) {
  return PHASE_GRAMMAR[phaseName] ?? PHASE_GRAMMAR.seed;
}

function braceTokens(bracePair) {
  if (typeof bracePair !== 'string' || bracePair.length !== 2) {
    return ['{', '}'];
  }

  return [bracePair.charAt(0), bracePair.charAt(1)];
}

function conceptName(label) {
  const key = String(label ?? '').toLowerCase();

  if (key.includes('wonder')) {
    return 'wonder';
  }
  if (key.includes('potential')) {
    return 'potential';
  }
  if (key.includes('perspective')) {
    return 'perspective';
  }
  if (key.includes('definition')) {
    return 'definition';
  }
  if (key.includes('action')) {
    return 'action';
  }
  if (key.includes('integration')) {
    return 'integration';
  }

  return 'interaction';
}

function atlasLightingFromState(state) {
  const phaseIndex = Math.max(0, PHASE_SEQUENCE.indexOf(state.phase));
  const clickWave = state.clickCount % 11;
  return {
    angle: `${108 + phaseIndex * 28 + clickWave * 5}deg`,
    power: (0.34 + phaseIndex * 0.16 + clickWave * 0.015).toFixed(3),
    tilt: `${-4 + (clickWave % 9)}deg`
  };
}

function seedCaption(label, phase, clickCount) {
  const grammar = phaseGrammar(phase);
  const [openBrace, closeBrace] = braceTokens(grammar.brace);
  return `${grammar.operator}seed[${slug(label)}]${openBrace} phase:${phase} click:${clickCount} atlas:facet-lumen ${closeBrace}`;
}

function ensureAtlasMarkup(container, documentRef) {
  container.innerHTML = '';

  const figure = documentRef.createElement('figure');
  figure.className = 'seed-atlas__figure';

  const leadImage = documentRef.createElement('img');
  leadImage.className = 'seed-atlas__lead-image';
  leadImage.loading = 'lazy';
  leadImage.decoding = 'async';

  const caption = documentRef.createElement('figcaption');
  caption.className = 'seed-atlas__caption';

  const literacy = documentRef.createElement('aside');
  literacy.className = 'seed-atlas__literacy';
  literacy.setAttribute('aria-live', 'polite');
  literacy.innerHTML = `\n    <h3 class=\"seed-atlas__literacy-title\">^learn[prompt]</h3>\n    <p class=\"seed-atlas__literacy-body\" data-role=\"literacy-body\"></p>\n  `;

  const strip = documentRef.createElement('ul');
  strip.className = 'seed-atlas__strip';
  strip.setAttribute('role', 'list');
  strip.setAttribute('aria-label', 'Seed atlas frame selector');
  strip.setAttribute('data-role', 'atlas-strip');

  figure.append(leadImage, caption, literacy, strip);
  container.append(figure);

  return {
    leadImage,
    caption,
    strip,
    literacyBody: literacy.querySelector('[data-role=\"literacy-body\"]')
  };
}

function buildStrip(stripNode, images, documentRef, assetVersion) {
  stripNode.innerHTML = '';
  const thumbButtons = [];

  images.forEach((imagePath, imageIndex) => {
    const item = documentRef.createElement('li');
    const button = documentRef.createElement('button');
    const thumb = documentRef.createElement('img');

    button.type = 'button';
    button.className = 'seed-atlas__thumb-button';
    button.dataset.index = String(imageIndex);
    button.setAttribute('aria-label', `Focus seed frame ${imageIndex + 1}`);
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight Home End Enter Space');

    thumb.src = appendVersion(imagePath, assetVersion);
    thumb.alt = `${humanLabelFromImagePath(imagePath)} thumbnail`;
    thumb.loading = 'lazy';
    thumb.decoding = 'async';
    thumb.className = 'seed-atlas__thumb';
    thumb.setAttribute('data-active', 'false');

    button.append(thumb);
    item.append(button);
    stripNode.append(item);
    thumbButtons.push(button);
  });

  return thumbButtons;
}

function applyActiveThumbs(thumbButtons, activeIndex) {
  thumbButtons.forEach((button, index) => {
    const isActive = index === activeIndex;
    button.setAttribute('data-active', isActive ? 'true' : 'false');
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    if (isActive) {
      button.setAttribute('aria-current', 'true');
    } else {
      button.removeAttribute('aria-current');
    }
  });
}

function literacyPrompt(label, phase, clickCount) {
  const grammar = phaseGrammar(phase);
  const [openBrace, closeBrace] = braceTokens(grammar.brace);
  const concept = conceptName(label);
  return `${grammar.operator}learn[${concept}]${openBrace} label:${slug(label)} phase:${phase} click:${clickCount} mode:reader-trace ${closeBrace}`;
}

export function installEnhancement({ app, route, document: documentRef, entry, manifest }) {
  const targetSelector = entry.target ?? '[data-role="seed-atlas"]';
  const container = documentRef.querySelector(targetSelector);
  const images = Array.isArray(entry.images) ? entry.images : [];

  if (!container || images.length === 0) {
    return () => {};
  }

  container.setAttribute('data-atlas-state', 'active');
  container.setAttribute('data-profile', manifest.profile);
  container.setAttribute('data-route', route);

  const { leadImage, caption, strip, literacyBody } = ensureAtlasMarkup(container, documentRef);
  const stripButtons = buildStrip(strip, images, documentRef, entry.assetVersion);
  let lastState = app.store.getState();
  let lastActiveIndex = -1;
  let lastLeadImageSrc = '';

  const applySpaceMetrics = (metrics) => {
    container.dataset.inlineBand = metrics.inlineBand;
    container.dataset.blockBand = metrics.blockBand;
    container.dataset.areaBand = metrics.areaBand;
    container.style.setProperty('--atlas-inline-size', `${metrics.width}px`);
    container.style.setProperty('--atlas-block-size', `${metrics.height}px`);

    const columns = Math.max(3, Math.min(10, Math.round(metrics.width / 120)));
    container.style.setProperty('--atlas-strip-columns', String(columns));
  };

  const cleanupSpaceSampler = installSporadicSpaceSampler({
    node: container,
    intervalMs: 2800,
    minDelta: 12,
    onSample: (metrics) => {
      applySpaceMetrics(metrics);
    }
  });

  const setFrameIndex = (requestedIndex, sourceLabel) => {
    if (!Number.isFinite(requestedIndex) || requestedIndex < 0 || requestedIndex >= images.length) {
      return;
    }

    const currentState = app.store.getState();
    const nextClickCount = clickCountForIndex(images, currentState.clickCount, requestedIndex);
    if (nextClickCount === currentState.clickCount) {
      return;
    }

    app.store.update((draft) => {
      draft.clickCount = clickCountForIndex(images, draft.clickCount, requestedIndex);
      draft.lastClickSource = sourceLabel;
    }, 'seed:thumb:select');
  };

  const applyState = (state) => {
    const activeIndex = resolveIndex(images, state.clickCount);
    const activeImage = images[activeIndex];
    const label = humanLabelFromImagePath(activeImage);
    const lighting = atlasLightingFromState(state);

    container.setAttribute('data-phase', state.phase);
    container.style.setProperty('--atlas-click-count', String(state.clickCount));
    container.style.setProperty('--atlas-lumen-angle', lighting.angle);
    container.style.setProperty('--atlas-lumen-power', lighting.power);
    container.style.setProperty('--atlas-tilt', lighting.tilt);

    const nextImageSrc = appendVersion(activeImage, entry.assetVersion);
    if (lastLeadImageSrc !== nextImageSrc) {
      leadImage.src = nextImageSrc;
      lastLeadImageSrc = nextImageSrc;
    }
    leadImage.alt = `${label} seed image`;
    caption.textContent = seedCaption(label, state.phase, state.clickCount);
    if (literacyBody) {
      literacyBody.textContent = literacyPrompt(label, state.phase, state.clickCount);
    }

    if (lastActiveIndex !== activeIndex) {
      applyActiveThumbs(stripButtons, activeIndex);
      lastActiveIndex = activeIndex;
    }
    lastState = state;
  };

  const onStripClick = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest('.seed-atlas__thumb-button');
    if (!button) {
      return;
    }

    const requestedIndex = Number.parseInt(button.dataset.index ?? '', 10);
    if (!Number.isFinite(requestedIndex) || requestedIndex < 0 || requestedIndex >= images.length) {
      return;
    }

    setFrameIndex(requestedIndex, 'seed-atlas-thumb');
  };

  const onStripKeydown = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest('.seed-atlas__thumb-button');
    if (!button) {
      return;
    }

    const currentIndex = Number.parseInt(button.dataset.index ?? '', 10);
    if (!Number.isFinite(currentIndex)) {
      return;
    }

    let nextIndex = null;

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + images.length) % images.length;
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % images.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = images.length - 1;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    const nextButton = stripButtons[nextIndex];
    nextButton?.focus();
    setFrameIndex(nextIndex, 'seed-atlas-keyboard');
  };

  strip.addEventListener('click', onStripClick);
  strip.addEventListener('keydown', onStripKeydown);

  applyState(lastState);
  const unsubscribe = app.store.subscribe((nextState) => {
    applyState(nextState);
  });

  if (app.marginalia) {
    app.marginalia.write('seed', 'Loaded seed atlas enhancement', {
      route,
      imageCount: images.length,
      profile: manifest.profile
    });
  }

  return () => {
    strip.removeEventListener('click', onStripClick);
    strip.removeEventListener('keydown', onStripKeydown);
    cleanupSpaceSampler();
    unsubscribe();
  };
}
