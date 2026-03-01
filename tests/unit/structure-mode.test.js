import test from 'node:test';
import assert from 'node:assert/strict';

import { installStructureMode } from '../../src/core/structure-mode.js';

function createNode(initialAttributes = {}) {
  const attributes = new Map(Object.entries(initialAttributes));

  return {
    dataset: {},
    textContent: '',
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null;
    },
    removeAttribute(name) {
      attributes.delete(name);
    }
  };
}

function createDocumentStub(structureNodes, toggleNodes) {
  return {
    documentElement: { dataset: {} },
    querySelectorAll(selector) {
      if (selector === '[data-structure-label]') {
        return structureNodes;
      }

      if (selector === '[data-role="structure-toggle"]') {
        return toggleNodes;
      }

      return [];
    },
    addEventListener() {},
    removeEventListener() {}
  };
}

function createWindowStub() {
  const store = new Map();
  return {
    location: { href: 'https://spwashi.click/' },
    localStorage: {
      getItem(key) {
        return store.has(key) ? store.get(key) : null;
      },
      setItem(key, value) {
        store.set(key, value);
      }
    }
  };
}

test('installStructureMode toggles aria descriptions without visual coupling', () => {
  const structureNode = createNode({ 'data-structure-label': 'Narrative section with progressive panels' });
  const toggleNode = createNode();
  const doc = createDocumentStub([structureNode], [toggleNode]);
  const win = createWindowStub();

  const controller = installStructureMode(doc, win);
  assert.equal(doc.documentElement.dataset.llmReadableStructure, 'false');
  assert.equal(structureNode.getAttribute('aria-description'), null);

  controller.setEnabled(true);
  assert.equal(doc.documentElement.dataset.llmReadableStructure, 'true');
  assert.equal(
    structureNode.getAttribute('aria-description'),
    'Narrative section with progressive panels'
  );
  assert.equal(toggleNode.getAttribute('aria-pressed'), 'true');

  controller.destroy();
});
