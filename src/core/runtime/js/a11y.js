// ^memo[nav-links]{ cache:weakmap key:root-element value:static-nodelist strategy:query-once }
// ^invariant[memo]{ nav-links:mostly-static root:singleton replacement:none }
const navLinksCache = new WeakMap();

export function installAccessibilityEnhancements(doc = globalThis.document) {
  if (!doc) {
    return () => {};
  }

  const body = doc.body;
  const root = doc.documentElement;

  root.classList.add('js-enabled');
  body.dataset.inputModality = 'pointer';

  const onKeydown = (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    if (event.key.length === 1 || event.key.startsWith('Arrow') || event.key === 'Tab') {
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

export function ensureAriaCurrent(rootElement, activeRoute) {
  if (!rootElement) {
    return;
  }

  // ^branch[memo]{ hit:reuse miss:query+cache }
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
