import test from 'node:test';
import assert from 'node:assert/strict';

import { installRuntimeControl } from '../../src/core/runtime/js/runtime-control.js';

function createStoreStub() {
  let state = {
    clickCount: 0,
    phase: 'seed',
    unlockedLayers: ['geometry'],
    reducedMotion: false,
    activeRoute: 'home',
    lastClickSource: 'bootstrap'
  };

  return {
    getState() {
      return state;
    },
    setRoute(route) {
      state = { ...state, activeRoute: route };
      return state;
    },
    setReducedMotion(value) {
      state = { ...state, reducedMotion: Boolean(value) };
      return state;
    },
    resetClickCount() {
      state = { ...state, clickCount: 0 };
      return state;
    },
    update(recipe) {
      const draft = { ...state, unlockedLayers: [...state.unlockedLayers] };
      const next = recipe(draft) ?? draft;
      state = {
        ...state,
        ...next,
        clickCount: Number.isFinite(next.clickCount) ? next.clickCount : state.clickCount
      };
      return state;
    }
  };
}

function createNodeStub() {
  const attributes = new Map();
  const styleMap = new Map();

  return {
    dataset: {},
    textContent: '',
    style: {
      setProperty(name, value) {
        styleMap.set(name, String(value));
      },
      removeProperty(name) {
        styleMap.delete(name);
      },
      getPropertyValue(name) {
        return styleMap.get(name) ?? '';
      }
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    }
  };
}

function createDocumentStub() {
  const root = createNodeStub();
  const regionNode = createNodeStub();

  return {
    documentElement: root,
    querySelectorAll(selector) {
      if (selector === '.region') {
        return [regionNode];
      }

      return [];
    }
  };
}

function createWindowStub() {
  const events = [];
  return {
    events,
    dispatched: [],
    dispatchEvent(event) {
      events.push(event.type);
      this.dispatched.push(event);
      return true;
    }
  };
}

test('runtime control setTopLevel and setRegion mutate state and nodes', () => {
  const store = createStoreStub();
  const doc = createDocumentStub();
  const win = createWindowStub();

  const app = {
    store,
    ecology: { getSnapshot: () => ({ species: {} }) },
    releaseMeta: { releaseDate: '2026-02-28', releaseId: 'r1' },
    runtimeConfig: { embedMode: 'standalone', baseUrl: '/', enableServiceWorker: true, hostId: 'spwashi.work', hostVersion: 'r7' },
    parserBridge: { installed: true, reason: 'adapter-loaded', adapterPath: '/seed/site/enhancements/workbench-parser-adapter.js', adapterExport: 'parseSpwForm' },
    performanceController: {
      profile: 'field',
      getProfile() {
        return this.profile;
      },
      setProfile(nextProfile) {
        this.profile = nextProfile;
      }
    },
    structureController: {
      enabled: false,
      setEnabled(nextEnabled) {
        this.enabled = nextEnabled;
      }
    },
    marginalia: { write() {} }
  };

  const cleanup = installRuntimeControl({
    app,
    document: doc,
    window: win,
    rebindPage() {}
  });

  const snapshot = win.__SPW_RUNTIME__.setTopLevel({
    route: 'notes',
    clickCount: 6,
    performanceProfile: 'maximal',
    llmReadableStructure: true
  });

  assert.equal(snapshot.state.activeRoute, 'notes');
  assert.equal(snapshot.state.clickCount, 6);
  assert.equal(snapshot.performanceProfile, 'maximal');
  assert.equal(snapshot.llmReadableStructure, true);
  assert.equal(snapshot.parserBridge.installed, true);
  assert.equal(snapshot.parserBridge.reason, 'adapter-loaded');
  assert.equal(snapshot.hostId, 'spwashi.work');
  assert.equal(snapshot.hostVersion, 'r7');

  const regionResult = win.__SPW_RUNTIME__.setRegion({
    selector: '.region',
    params: {
      attributes: { 'data-mode': 'active' },
      dataset: { state: 'hot' },
      style: { '--fx-custom': '0.9' },
      text: '^region{ tuned }'
    }
  });

  assert.equal(regionResult.matched, 1);
  assert.equal(doc.querySelectorAll('.region')[0].getAttribute('data-mode'), 'active');
  assert.equal(doc.querySelectorAll('.region')[0].dataset.state, 'hot');
  assert.equal(doc.querySelectorAll('.region')[0].style.getPropertyValue('--fx-custom'), '0.9');

  cleanup();
  assert.equal(typeof win.__SPW_RUNTIME__, 'undefined');
});

test('runtime control reset and rebind methods are available', () => {
  const store = createStoreStub();
  const doc = createDocumentStub();
  const win = createWindowStub();
  let rebindCalls = 0;

  const app = {
    store,
    ecology: { getSnapshot: () => ({ species: {} }) },
    releaseMeta: { releaseDate: '2026-02-28', releaseId: 'r1' },
    runtimeConfig: { embedMode: 'standalone', baseUrl: '/', enableServiceWorker: true, hostId: 'spwashi.work', hostVersion: 'r7' },
    performanceController: {
      profile: 'field',
      getProfile() {
        return this.profile;
      },
      setProfile(nextProfile) {
        this.profile = nextProfile;
      }
    },
    structureController: {
      enabled: false,
      setEnabled(nextEnabled) {
        this.enabled = nextEnabled;
      }
    },
    marginalia: { write() {} }
  };

  const cleanup = installRuntimeControl({
    app,
    document: doc,
    window: win,
    rebindPage() {
      rebindCalls += 1;
    }
  });

  win.__SPW_RUNTIME__.setTopLevel({ clickCount: 9, route: 'work' });
  const resetSnapshot = win.__SPW_RUNTIME__.run('reset', { route: 'home' });
  assert.equal(resetSnapshot.state.clickCount, 0);
  assert.equal(resetSnapshot.state.activeRoute, 'home');

  const rebindSnapshot = win.__SPW_RUNTIME__.run('rebind');
  assert.equal(rebindCalls, 1);
  assert.equal(rebindSnapshot.state.activeRoute, 'home');
  assert.ok(win.events.includes('spw:runtime:rebind'));
  assert.equal(win.dispatched.at(-1)?.detail?.route, 'home');

  cleanup();
});

test('runtime control exposes feature catalog for agents', () => {
  const store = createStoreStub();
  const doc = createDocumentStub();
  const win = createWindowStub();

  const app = {
    store,
    ecology: { getSnapshot: () => ({ species: {} }) },
    releaseMeta: { releaseDate: '2026-02-28', releaseId: 'r1' },
    runtimeConfig: { embedMode: 'embedded', baseUrl: '/vendor/spw', enableServiceWorker: false, hostId: 'lore.land', hostVersion: '2026.03.01' },
    parserBridge: { installed: true, reason: 'adapter-loaded', adapterPath: '/seed/site/enhancements/workbench-parser-adapter.js', adapterExport: 'parseExpression' },
    performanceController: {
      profile: 'field',
      getProfile() {
        return this.profile;
      },
      setProfile(nextProfile) {
        this.profile = nextProfile;
      }
    },
    structureController: {
      enabled: false,
      setEnabled(nextEnabled) {
        this.enabled = nextEnabled;
      }
    },
    marginalia: { write() {} }
  };

  const cleanup = installRuntimeControl({
    app,
    document: doc,
    window: win,
    rebindPage() {}
  });

  const summary = win.__SPW_RUNTIME__.run('catalog', { summaryOnly: true });
  assert.equal(typeof summary.featureCount, 'number');
  assert.ok(summary.featureCount > 0);
  assert.ok(Array.isArray(summary.routes));

  const fullCatalog = win.__SPW_RUNTIME__.getCatalog();
  assert.equal(Array.isArray(fullCatalog.features), true);
  assert.ok(fullCatalog.features.length > 0);

  const integrationStatus = win.__SPW_RUNTIME__.run('integration');
  assert.equal(integrationStatus.parserBridge.installed, true);
  assert.equal(integrationStatus.parserBridge.adapterExport, 'parseExpression');
  assert.equal(integrationStatus.runtime.embedMode, 'embedded');
  assert.equal(integrationStatus.runtime.baseUrl, '/vendor/spw');
  assert.equal(integrationStatus.runtime.hostId, 'lore.land');
  assert.equal(integrationStatus.runtime.hostVersion, '2026.03.01');

  cleanup();
});

test('runtime control evaluates Spw command forms for top-level and region operations', () => {
  const store = createStoreStub();
  const doc = createDocumentStub();
  const win = createWindowStub();

  const app = {
    store,
    ecology: { getSnapshot: () => ({ species: {} }) },
    releaseMeta: { releaseDate: '2026-02-28', releaseId: 'r1' },
    runtimeConfig: { embedMode: 'standalone', baseUrl: '/', enableServiceWorker: true, hostId: 'spwashi.work', hostVersion: 'r7' },
    parserBridge: { installed: false, reason: 'adapter-not-available' },
    performanceController: {
      profile: 'field',
      getProfile() {
        return this.profile;
      },
      setProfile(nextProfile) {
        this.profile = nextProfile;
      }
    },
    structureController: {
      enabled: false,
      setEnabled(nextEnabled) {
        this.enabled = nextEnabled;
      }
    },
    marginalia: { write() {} }
  };

  const cleanup = installRuntimeControl({
    app,
    document: doc,
    window: win,
    rebindPage() {}
  });

  const topCommandResult = win.__SPW_RUNTIME__.run(
    'spw',
    '!top{ route:notes clicks:11 profile:maximal llm:true }'
  );
  assert.equal(topCommandResult.ok, true);
  assert.equal(topCommandResult.method, 'setTopLevel');
  assert.equal(topCommandResult.result.state.activeRoute, 'notes');
  assert.equal(topCommandResult.result.state.clickCount, 11);
  assert.equal(topCommandResult.result.performanceProfile, 'maximal');
  assert.equal(topCommandResult.result.llmReadableStructure, true);

  const regionCommandResult = win.__SPW_RUNTIME__.evalSpw(
    '!region{ selector:.region attr.data-mode:active data.state:hot style.--fx-custom:0.75 text:"^region{ tuned }" }'
  );
  assert.equal(regionCommandResult.ok, true);
  assert.equal(regionCommandResult.method, 'setRegion');
  assert.equal(regionCommandResult.result.matched, 1);
  assert.equal(doc.querySelectorAll('.region')[0].getAttribute('data-mode'), 'active');
  assert.equal(doc.querySelectorAll('.region')[0].dataset.state, 'hot');
  assert.equal(doc.querySelectorAll('.region')[0].style.getPropertyValue('--fx-custom'), '0.75');
  assert.equal(doc.querySelectorAll('.region')[0].textContent, '^region{ tuned }');

  const invalidCommandResult = win.__SPW_RUNTIME__.evalSpw('!unknown{ route:home }');
  assert.equal(invalidCommandResult.ok, false);
  assert.match(invalidCommandResult.error, /Unsupported Spw runtime symbol/i);

  const statusCommandResult = win.__SPW_RUNTIME__.evalSpw('!status{ compact:true }');
  assert.equal(statusCommandResult.ok, true);
  assert.equal(statusCommandResult.method, 'getIntegrationStatus');
  assert.equal(statusCommandResult.result.parserBridge.reason, 'adapter-not-available');
  assert.equal(statusCommandResult.result.runtime.hostId, 'spwashi.work');

  cleanup();
});

test('runtime control exposes versioned api contract, composable interfaces, and ecology extension methods', () => {
  const store = createStoreStub();
  const doc = createDocumentStub();
  const win = createWindowStub();

  const app = {
    store,
    ecology: {
      species: {},
      getSnapshot() {
        return { species: this.species };
      },
      registerSpecies(species) {
        this.species[species.tagName] = species;
      },
      noteLifecycle(tagName, lifecycle, detail) {
        this.species[tagName] = {
          ...(this.species[tagName] ?? { tagName, role: 'host-extension', dependsOn: [], emits: [] }),
          lastLifecycle: lifecycle,
          lastDetail: detail
        };
      }
    },
    releaseMeta: { releaseDate: '2026-03-01', releaseId: 'r2', releaseArc: 'host', releaseVibe: 'adaptive' },
    runtimeConfig: { embedMode: 'embedded', baseUrl: '/vendor/spw', enableServiceWorker: false, hostId: 'lore.land', hostVersion: '2026.03.01' },
    apiContract: {
      runtimeApiVersion: '1.1.0',
      interfaces: {
        core: '1.1.0',
        catalog: '1.0.0',
        integration: '1.1.0',
        ecology: '1.0.0',
        theming: '1.0.0',
        host: '1.0.0'
      }
    },
    hostManifest: { version: '1', reason: 'ok', source: '/seed/hosts/lore.manifest.json', api: { compatible: true } },
    hostThemeController: {
      getState() {
        return { activeRuleIds: ['mobile', 'high-contrast'], tokenCount: 6, reason: 'theme:init' };
      }
    },
    parserBridge: { installed: true, reason: 'adapter-loaded', adapterPath: '/seed/site/enhancements/workbench-parser-adapter.js', adapterExport: 'parseExpression' },
    performanceController: {
      profile: 'field',
      getProfile() {
        return this.profile;
      },
      setProfile(nextProfile) {
        this.profile = nextProfile;
      }
    },
    structureController: {
      enabled: false,
      setEnabled(nextEnabled) {
        this.enabled = nextEnabled;
      }
    },
    marginalia: { write() {} }
  };

  const cleanup = installRuntimeControl({
    app,
    document: doc,
    window: win,
    rebindPage() {}
  });

  const contract = win.__SPW_RUNTIME__.run('contract');
  assert.equal(contract.runtimeApiVersion, '1.1.0');
  assert.equal(contract.interfaces.ecology, '1.0.0');

  const composed = win.__SPW_RUNTIME__.run('compose', { interfaces: ['ecology', 'integration'] });
  assert.equal(composed.ok, true);
  assert.equal(typeof composed.api.registerEcologySpecies, 'function');
  assert.equal(typeof composed.api.getIntegrationStatus, 'function');

  const registerSpeciesResult = win.__SPW_RUNTIME__.registerEcologySpecies({
    tagName: 'spw-host-card',
    role: 'host-widget',
    dependsOn: ['spw-site-shell'],
    emits: ['spw:navigate']
  });
  assert.equal(registerSpeciesResult.registered, 1);
  assert.ok(registerSpeciesResult.snapshot.species['spw-host-card']);

  const lifecycleResult = win.__SPW_RUNTIME__.noteEcologyLifecycle({
    tagName: 'spw-host-card',
    lifecycle: 'rendered',
    detail: { source: 'host-test' }
  });
  assert.equal(lifecycleResult.ok, true);
  assert.equal(lifecycleResult.snapshot.species['spw-host-card'].lastLifecycle, 'rendered');

  const status = win.__SPW_RUNTIME__.getIntegrationStatus();
  assert.equal(status.hostTheme.activeRuleIds.length, 2);
  assert.equal(status.hostManifest.compatible, true);

  const hostManifest = win.__SPW_RUNTIME__.run('hostManifest');
  assert.equal(hostManifest.reason, 'ok');
  assert.equal(hostManifest.source, '/seed/hosts/lore.manifest.json');

  cleanup();
});
