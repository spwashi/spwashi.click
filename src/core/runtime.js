import { installAccessibilityEnhancements } from './a11y.js';
import { createEcologyLedger } from './ecology.js';
import {
  EVENT_APP_READY,
  EVENT_ECOLOGY_CHANGED,
  EVENT_INTENT_CLICK,
  EVENT_NAVIGATE,
  EVENT_PHASE_CHANGED,
  EVENT_STATE_CHANGED,
  EVENT_WORKBENCH_PARSER_STATE,
  dispatchTypedEvent,
  subscribeTypedEvent
} from './events.js';
import { runIterativeEnhancements } from './iterative-enhancement.js';
import { createMarginaliaLedger } from './literature.js';
import { detectReducedMotionPreference, watchReducedMotionPreference } from './motion.js';
import { installAtmosphereDrift, installPerformanceTuning } from './performance-tuning.js';
import { installPwaSupport } from './pwa.js';
import { readReleaseMeta } from './release.js';
import { resolveRuntimeAssetUrl, readRuntimeConfig } from './runtime-config.js';
import { routeFromHref, routeFromPathname } from './router-lite.js';
import { installRuntimeControl } from './runtime-control.js';
import { installWorkbenchParserAdapter } from './spwlang-parser.js';
import { createStore } from './store.js';
import { installStructureMode } from './structure-mode.js';
import { installMediumFlow } from './medium-flow.js';
import { defineAllComponents } from '../components/register.js';
import { HOME_MANIFEST, NOTES_MANIFEST, WORK_MANIFEST } from '../content/manifests.js';
import { initHomePage } from '../pages/home.js';
import { initNotesPage } from '../pages/notes.js';
import { initWorkPage } from '../pages/work.js';

const PAGE_INITIALIZERS = Object.freeze({
  home: initHomePage,
  work: initWorkPage,
  notes: initNotesPage
});

const CONTENT_MANIFESTS = Object.freeze({
  home: HOME_MANIFEST,
  work: WORK_MANIFEST,
  notes: NOTES_MANIFEST
});

function syncRootStateAttributes(doc, nextState) {
  const root = doc.documentElement;
  root.dataset.route = nextState.activeRoute;
  root.dataset.phase = nextState.phase;
  root.dataset.clickCount = String(nextState.clickCount);
  root.dataset.reducedMotion = nextState.reducedMotion ? 'true' : 'false';
}

function syncLiteratureAttributes(doc, marginalia) {
  doc.documentElement.dataset.marginaliaLines = String(marginalia.count());
}

function bridgeStoreToEvents({ app, doc, win }) {
  return app.store.subscribe((nextState, previousState, reason) => {
    syncRootStateAttributes(doc, nextState);

    app.ecology.setRoute(nextState.activeRoute);
    app.ecology.setPhase(nextState.phase);

    app.marginalia.write('state', `Transition: ${reason}`, {
      route: nextState.activeRoute,
      phase: nextState.phase,
      clickCount: nextState.clickCount
    });
    syncLiteratureAttributes(doc, app.marginalia);

    dispatchTypedEvent(win, EVENT_STATE_CHANGED, {
      prev: previousState,
      next: nextState,
      reason
    });

    if (previousState.phase !== nextState.phase) {
      dispatchTypedEvent(win, EVENT_PHASE_CHANGED, {
        phase: nextState.phase,
        clickCount: nextState.clickCount
      });
    }
  });
}

function bridgeEcologyToEvents({ app, doc, win }) {
  return app.ecology.subscribe((nextSnapshot, previousSnapshot, reason) => {
    doc.documentElement.dataset.ecologyReason = reason;
    doc.documentElement.dataset.ecologySpeciesCount = String(
      Object.keys(nextSnapshot.species).length
    );

    dispatchTypedEvent(win, EVENT_ECOLOGY_CHANGED, {
      prev: previousSnapshot,
      next: nextSnapshot,
      reason
    });
  });
}

function installIntentListeners({ app, win }) {
  const removeIntentListener = subscribeTypedEvent(win, EVENT_INTENT_CLICK, (event) => {
    const source = event.detail?.source ?? 'unknown';
    app.store.registerClick(source);
  });

  const removeNavigateListener = subscribeTypedEvent(win, EVENT_NAVIGATE, (event) => {
    const href = event.detail?.href;
    if (typeof href !== 'string' || href.length === 0) {
      return;
    }

    app.store.setRoute(routeFromHref(href));
  });

  return () => {
    removeIntentListener();
    removeNavigateListener();
  };
}

function initializePage({ routeName, app, doc }) {
  const initPage = PAGE_INITIALIZERS[routeName] ?? PAGE_INITIALIZERS.home;
  const manifest = CONTENT_MANIFESTS[routeName] ?? CONTENT_MANIFESTS.home;

  app.marginalia.write('page', `Initialize route ${routeName}`, {
    manifestTitle: manifest.metaTitle
  });
  syncLiteratureAttributes(doc, app.marginalia);

  initPage({
    route: routeName,
    store: app.store,
    manifest,
    document: doc
  });
}

function createApp({ doc, win, runtimeConfig }) {
  const activeRoute = routeFromPathname(win.location.pathname);
  const reducedMotion = detectReducedMotionPreference(win);
  const releaseMeta = readReleaseMeta(doc);
  const store = createStore({ activeRoute, reducedMotion });
  const ecology = createEcologyLedger();
  const marginalia = createMarginaliaLedger();
  const structureController = installStructureMode(doc, win);
  const performanceController = installPerformanceTuning(doc, win, {
    reducedMotion,
    onProfileChange(nextProfile, nextConfig) {
      marginalia.write('performance', `Profile applied: ${nextProfile}`, {
        profile: nextProfile,
        frameRate: nextConfig.frameRate
      });
      syncLiteratureAttributes(doc, marginalia);
    }
  });

  const cleanups = [];

  const app = {
    route: activeRoute,
    releaseMeta,
    runtimeConfig,
    parserBridge: { installed: false, reason: 'not-initialized' },
    store,
    ecology,
    marginalia,
    structureController,
    performanceController,
    enhancementRuntime: null,
    runtimeControlCleanup: null,
    pwaController: null,
    mediumController: null,
    destroy() {
      this.enhancementRuntime?.cleanup?.();

      if (this.runtimeControlCleanup) {
        this.runtimeControlCleanup();
        this.runtimeControlCleanup = null;
      }

      if (this.pwaController) {
        this.pwaController.destroy();
        this.pwaController = null;
      }

      if (this.mediumController) {
        this.mediumController.destroy();
        this.mediumController = null;
      }

      for (const cleanup of cleanups) {
        cleanup();
      }
      cleanups.length = 0;
    }
  };

  syncRootStateAttributes(doc, store.getState());
  doc.documentElement.dataset.releaseDate = releaseMeta.releaseDate;
  doc.documentElement.dataset.releaseId = releaseMeta.releaseId;
  doc.documentElement.dataset.releaseArc = releaseMeta.releaseArc;
  doc.documentElement.dataset.releaseVibe = releaseMeta.releaseVibe;
  doc.documentElement.dataset.assetVersion = releaseMeta.assetVersion;
  doc.documentElement.dataset.llmReadableStructure = structureController.enabled ? 'true' : 'false';
  doc.documentElement.dataset.performanceProfile = performanceController.getProfile();
  doc.documentElement.dataset.spwEmbedMode = runtimeConfig.embedMode;
  doc.documentElement.dataset.spwBaseUrl = runtimeConfig.baseUrl;
  doc.documentElement.dataset.spwHostId = runtimeConfig.hostId;
  doc.documentElement.dataset.spwHostVersion = runtimeConfig.hostVersion;
  ecology.setRoute(activeRoute);
  ecology.setPhase(store.getState().phase);

  marginalia.write('boot', 'Create app container', {
    route: activeRoute,
    reducedMotion,
    releaseDate: releaseMeta.releaseDate,
    releaseId: releaseMeta.releaseId,
    releaseArc: releaseMeta.releaseArc,
    releaseVibe: releaseMeta.releaseVibe,
    performanceProfile: performanceController.getProfile(),
    embedMode: runtimeConfig.embedMode,
    baseUrl: runtimeConfig.baseUrl,
    hostId: runtimeConfig.hostId,
    hostVersion: runtimeConfig.hostVersion
  });
  syncLiteratureAttributes(doc, marginalia);

  cleanups.push(installAccessibilityEnhancements(doc));
  cleanups.push(bridgeStoreToEvents({ app, doc, win }));
  cleanups.push(bridgeEcologyToEvents({ app, doc, win }));
  cleanups.push(installIntentListeners({ app, win }));
  cleanups.push(() => structureController.destroy());
  cleanups.push(() => performanceController.destroy());
  cleanups.push(installAtmosphereDrift(doc, win, performanceController));
  cleanups.push(
    watchReducedMotionPreference(win, (nextReducedMotion) => {
      app.store.setReducedMotion(nextReducedMotion);
    })
  );

  return app;
}

async function mountRuntimeApp({ app, doc, win }) {
  const parserBridge = await installWorkbenchParserAdapter({
    assetVersion: app.releaseMeta.assetVersion,
    runtimeConfig: app.runtimeConfig
  });
  app.parserBridge = parserBridge;
  app.marginalia.write('parser', 'Spw parser bridge status', parserBridge);
  dispatchTypedEvent(win, EVENT_WORKBENCH_PARSER_STATE, {
    installed: Boolean(parserBridge.installed),
    reason: parserBridge.reason ?? 'unknown',
    adapterPath: parserBridge.adapterPath ?? '',
    adapterExport: parserBridge.adapterExport ?? '',
    releaseId: app.releaseMeta.releaseId,
    hostId: app.runtimeConfig.hostId,
    hostVersion: app.runtimeConfig.hostVersion
  });
  syncLiteratureAttributes(doc, app.marginalia);

  const textureTuner = await app.performanceController.loadTextureTuner({
    assetVersion: app.releaseMeta.assetVersion
  });
  app.marginalia.write('texture', 'Texture tuner status', textureTuner);
  syncLiteratureAttributes(doc, app.marginalia);

  if (app.runtimeConfig.enableServiceWorker) {
    app.pwaController = installPwaSupport({
      document: doc,
      window: win,
      releaseMeta: app.releaseMeta,
      runtimeConfig: app.runtimeConfig,
      onStateChange(nextState) {
        app.marginalia.write('pwa', 'PWA state changed', nextState);
        syncLiteratureAttributes(doc, app.marginalia);
      }
    });
  } else {
    doc.documentElement.dataset.pwaState = 'disabled';
    doc.documentElement.dataset.networkState = 'unknown';
  }

  defineAllComponents(app.ecology);
  initializePage({ routeName: app.route, app, doc });
  app.runtimeControlCleanup = installRuntimeControl({
    app,
    document: doc,
    window: win,
    rebindPage() {
      const route = app.store.getState().activeRoute;
      initializePage({ routeName: route, app, doc });
    }
  });

  app.mediumController = installMediumFlow({
    app,
    document: doc,
    window: win
  });

  app.enhancementRuntime = { manifest: { profile: 'baseline', enhancements: [] }, cleanups: [] };

  if (app.runtimeConfig.runEnhancements && app.runtimeConfig.embedMode !== 'assets-only') {
    win.setTimeout(() => {
      runIterativeEnhancements({
        app,
        route: app.route,
        document: doc,
        runtimeConfig: app.runtimeConfig,
        manifestPath: '/seed/site/enhancements.manifest.json'
      }).then((enhancementRuntime) => {
        app.enhancementRuntime = enhancementRuntime;
        app.marginalia.write('enhancement', 'Iterative enhancement stage complete', {
          profile: enhancementRuntime.manifest.profile,
          count: enhancementRuntime.manifest.enhancements.length
        });
        syncLiteratureAttributes(doc, app.marginalia);
      }).catch((error) => {
        console.warn('Enhancement loading failed, continuing with baseline', error);
      });
    }, 0);
  }

  dispatchTypedEvent(win, EVENT_APP_READY, {
    route: app.route,
    state: app.store.getState(),
    ecology: app.ecology.getSnapshot(),
    profile: app.enhancementRuntime.manifest.profile,
    release: app.releaseMeta,
    llmReadableStructure: app.structureController.enabled,
    performanceProfile: app.performanceController.getProfile(),
    textureTunerState: doc.documentElement.dataset.textureTunerState ?? 'unknown',
    embedMode: app.runtimeConfig.embedMode,
    baseUrl: app.runtimeConfig.baseUrl,
    hostId: app.runtimeConfig.hostId,
    hostVersion: app.runtimeConfig.hostVersion
  });

  return app;
}

export function showBootFailureMessage(doc = globalThis.document) {
  if (!doc?.body) {
    return;
  }

  const fallback = doc.createElement('div');
  fallback.style.cssText = [
    'padding: 2rem',
    'max-width: 48rem',
    'margin: 2rem auto',
    'background: #fff3cd',
    'border: 2px solid #856404',
    'border-radius: 0.5rem',
    'color: #856404'
  ].join('; ');
  fallback.innerHTML = '<p style="margin: 0;"><strong>Site initialization failed.</strong> Please refresh the page. If the issue persists, try clearing your browser cache.</p>';
  doc.body.prepend(fallback);
}

export function createSpwRuntime(options = {}) {
  const doc = options.document ?? globalThis.document;
  const win = options.window ?? globalThis.window;
  const runtimeConfig = readRuntimeConfig({ documentRef: doc, overrides: options });

  let app = null;
  let mountPromise = null;

  async function mount() {
    if (!doc || !win) {
      return null;
    }

    if (runtimeConfig.embedMode === 'assets-only') {
      doc.documentElement.dataset.spwEmbedMode = runtimeConfig.embedMode;
      doc.documentElement.dataset.spwBaseUrl = runtimeConfig.baseUrl;
      doc.documentElement.dataset.spwHostId = runtimeConfig.hostId;
      doc.documentElement.dataset.spwHostVersion = runtimeConfig.hostVersion;
      doc.documentElement.dataset.pwaState = 'disabled';
      return null;
    }

    if (app) {
      return app;
    }

    if (mountPromise) {
      return mountPromise;
    }

    mountPromise = (async () => {
      app = createApp({ doc, win, runtimeConfig });
      win.__SPW_APP__ = app;
      await mountRuntimeApp({ app, doc, win });
      return app;
    })();

    return mountPromise;
  }

  function destroy() {
    app?.destroy?.();
    if (win?.__SPW_APP__ === app) {
      delete win.__SPW_APP__;
    }
    app = null;
    mountPromise = null;
  }

  return Object.freeze({
    config: runtimeConfig,
    mount,
    destroy,
    getApp() {
      return app;
    }
  });
}

export async function mountSpwRuntime(options = {}) {
  const win = options.window ?? globalThis.window;
  if (win?.__SPW_RUNTIME_HANDLE__) {
    await win.__SPW_RUNTIME_HANDLE__.mount();
    return win.__SPW_RUNTIME_HANDLE__;
  }

  const runtime = createSpwRuntime(options);
  if (win) {
    win.__SPW_RUNTIME_HANDLE__ = runtime;
  }
  await runtime.mount();
  return runtime;
}
