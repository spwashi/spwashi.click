/**
 * Intent:
 * Install baseline accessibility behavior so keyboard and reduced-motion users get first-class interaction.
 * Invariants:
 * Input modality is represented on the body element and remains synchronized with current interaction mode.
 * How this composes with neighbors:
 * Boot calls setup once; component styles respond to data-input-modality and aria attributes.
 */

export function installAccessibilityEnhancements(doc = globalThis.document) {
  if (!doc) {
    return () => {};
  }

  const body = doc.body;
  const root = doc.documentElement;

  root.classList.add('js-enabled');
  body.dataset.inputModality = 'pointer';

  const onKeydown = (event) => {
    if (event.key === 'Tab') {
      body.dataset.inputModality = 'keyboard';
    }
  };

  const onPointer = () => {
    body.dataset.inputModality = 'pointer';
  };

  doc.addEventListener('keydown', onKeydown);
  doc.addEventListener('mousedown', onPointer);
  doc.addEventListener('touchstart', onPointer, { passive: true });

  return () => {
    doc.removeEventListener('keydown', onKeydown);
    doc.removeEventListener('mousedown', onPointer);
    doc.removeEventListener('touchstart', onPointer);
  };
}

// Cache for nav links to avoid repeated DOM queries
const navLinksCache = new WeakMap();

export function ensureAriaCurrent(rootElement, activeRoute) {
  if (!rootElement) {
    return;
  }

  // Use cached nav links if available, otherwise query and cache
  let navLinks = navLinksCache.get(rootElement);
  if (!navLinks) {
    navLinks = rootElement.querySelectorAll('[data-route]');
    navLinksCache.set(rootElement, navLinks);
  }

  for (const link of navLinks) {
    const isActive = link.dataset.route === activeRoute;
    if (isActive) {
      link.setAttribute('aria-current', 'page');
      link.dataset.active = 'true';
    } else {
      link.removeAttribute('aria-current');
      link.dataset.active = 'false';
    }
  }
}
