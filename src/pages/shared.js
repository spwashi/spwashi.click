/**
 * Intent:
 * Provide tiny DOM utilities for page modules so slot hydration and list rendering stay consistent.
 * Invariants:
 * Slot hydration only touches elements that explicitly opt in with data-slot attributes.
 * How this composes with neighbors:
 * Route-specific page initializers reuse these helpers to map content manifests to static templates.
 */

import { isLikelySpwForm, parseSpwForm } from '../core/spwlang-parser.js';

export function applySlots(doc, slots = {}) {
  for (const [slotName, slotValue] of Object.entries(slots)) {
    const node = doc.querySelector(`[data-slot="${slotName}"]`);
    if (node) {
      node.textContent = slotValue;

      if (typeof slotValue === 'string' && isLikelySpwForm(slotValue)) {
        const parseResult = parseSpwForm(slotValue);
        node.dataset.spwExecutable = parseResult.ok ? 'true' : 'false';
        node.dataset.spwParser = parseResult.parser ?? 'unknown';

        if (!parseResult.ok) {
          node.setAttribute('aria-invalid', 'true');
        } else {
          node.removeAttribute('aria-invalid');
        }
      }
    }
  }
}

export function clearElementChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}
