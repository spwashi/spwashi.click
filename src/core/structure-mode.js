/**
 * Intent:
 * Provide a toggleable low-noise structure-label mode that enriches ARIA descriptions for machine and assistive parsing.
 * Invariants:
 * Structure mode only annotates elements explicitly marked with data-structure-label and never changes layout semantics.
 * How this composes with neighbors:
 * Boot installs this once; pages/components opt in by adding data-structure-label and optional toggle controls.
 */

const STORAGE_KEY = 'spw:settings:llm-readable-structure';

function coerceBooleanFlag(value) {
  return value === '1' || value === 'true';
}

function readInitialMode(win = globalThis.window) {
  try {
    const queryFlag = new URL(win.location.href).searchParams.get('llmStructure');
    if (queryFlag !== null) {
      return coerceBooleanFlag(queryFlag);
    }

    const storedFlag = win.localStorage.getItem(STORAGE_KEY);
    return coerceBooleanFlag(storedFlag ?? 'false');
  } catch {
    return false;
  }
}

function persistMode(enabled, win = globalThis.window) {
  try {
    win.localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Storage is optional for this setting.
  }
}

function applyStructureLabels(doc, enabled) {
  const nodes = doc.querySelectorAll('[data-structure-label]');

  for (const node of nodes) {
    const label = node.getAttribute('data-structure-label');
    node.setAttribute('data-structure-active', enabled ? 'true' : 'false');

    if (enabled && label) {
      node.setAttribute('aria-description', label);
      continue;
    }

    node.removeAttribute('aria-description');
  }
}

function syncToggleButtons(doc, enabled) {
  const toggles = doc.querySelectorAll('[data-role="structure-toggle"]');

  for (const toggle of toggles) {
    toggle.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    toggle.textContent = enabled ? 'Structure Labels: On' : 'Structure Labels: Off';
  }
}

export function installStructureMode(doc = globalThis.document, win = globalThis.window) {
  if (!doc || !win) {
    return { enabled: false, setEnabled: () => {}, destroy: () => {} };
  }

  let enabled = readInitialMode(win);

  const apply = () => {
    doc.documentElement.dataset.llmReadableStructure = enabled ? 'true' : 'false';
    applyStructureLabels(doc, enabled);
    syncToggleButtons(doc, enabled);
  };

  const setEnabled = (nextEnabled) => {
    enabled = Boolean(nextEnabled);
    persistMode(enabled, win);
    apply();
  };

  const onToggleClick = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest('[data-role="structure-toggle"]')) {
      setEnabled(!enabled);
    }
  };

  doc.addEventListener('click', onToggleClick);
  apply();

  return {
    get enabled() {
      return enabled;
    },
    setEnabled,
    destroy() {
      doc.removeEventListener('click', onToggleClick);
    }
  };
}
