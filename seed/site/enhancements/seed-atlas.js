function humanLabelFromImagePath(imagePath) {
  const filename = imagePath.split('/').at(-1) ?? '';
  const withoutExt = filename.replace(/\.png$/i, '');
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

  figure.append(leadImage, caption, literacy, strip);
  container.append(figure);

  return {
    leadImage,
    caption,
    strip,
    literacyBody: literacy.querySelector('[data-role=\"literacy-body\"]')
  };
}

function renderStrip(stripNode, images, activeIndex, documentRef, assetVersion) {
  stripNode.innerHTML = '';

  images.forEach((imagePath, imageIndex) => {
    const item = documentRef.createElement('li');
    const thumb = documentRef.createElement('img');

    thumb.src = appendVersion(imagePath, assetVersion);
    thumb.alt = `${humanLabelFromImagePath(imagePath)} thumbnail`;
    thumb.loading = 'lazy';
    thumb.decoding = 'async';
    thumb.className = 'seed-atlas__thumb';
    thumb.setAttribute('data-active', imageIndex === activeIndex ? 'true' : 'false');

    item.append(thumb);
    stripNode.append(item);
  });
}

function literacyPrompt(label, phase, clickCount) {
  const labelKey = label.toLowerCase();
  const conceptPrompt = labelKey.includes('wonder')
    ? '^learn[wonder]{ probe: curiosity delta: state-shift }'
    : labelKey.includes('potential')
      ? '^learn[potential]{ superposition: true collapse: interaction }'
      : labelKey.includes('perspective')
        ? '^learn[perspective]{ observer: active meaning: relative }'
        : labelKey.includes('definition')
          ? '^learn[definition]{ constraint: explicit feedback: sharper }'
          : labelKey.includes('action')
            ? '^learn[action]{ effect: legible trace: required }'
            : labelKey.includes('integration')
              ? '^learn[integration]{ coherence: component-consensus }'
              : '^learn[interaction]{ cause=>response=>state }';

  return `${conceptPrompt} ^state{ phase: ${phase} click: ${clickCount} }`;
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

  const applyState = (state) => {
    const activeIndex = resolveIndex(images, state.clickCount);
    const activeImage = images[activeIndex];
    const label = humanLabelFromImagePath(activeImage);

    container.setAttribute('data-phase', state.phase);
    container.style.setProperty('--atlas-click-count', String(state.clickCount));

    leadImage.src = appendVersion(activeImage, entry.assetVersion);
    leadImage.alt = `${label} seed image`;
    caption.textContent = `^seed{ label: ${slug(label)} phase: ${state.phase} click: ${state.clickCount} }`;
    if (literacyBody) {
      literacyBody.textContent = literacyPrompt(label, state.phase, state.clickCount);
    }

    renderStrip(strip, images, activeIndex, documentRef, entry.assetVersion);
  };

  applyState(app.store.getState());
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
    unsubscribe();
  };
}
