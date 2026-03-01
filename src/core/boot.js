/**
 * Intent:
 * Bootstrap app state, component ecology, and route composition as a deterministic yet iteratively enhanceable system.
 * Invariants:
 * Core routes render without optional seed enhancements and store state remains the source of truth for phase behavior.
 * How this composes with neighbors:
 * Core modules provide state/events/ecology; page initializers compose content; iterative enhancements attach after baseline boot.
 */

import { installAccessibilityEnhancements } from './a11y.js';
import { createEcologyLedger } from './ecology.js';
import {
  EVENT_APP_READY,
  EVENT_ECOLOGY_CHANGED,
  EVENT_INTENT_CLICK,
  EVENT_NAVIGATE,
  EVENT_PHASE_CHANGED,
  EVENT_STATE_CHANGED,
  dispatchTypedEvent,
  subscribeTypedEvent
} from './events.js';
import { runIterativeEnhancements } from './iterative-enhancement.js';
import { createMarginaliaLedger } from './literature.js';
import { detectReducedMotionPreference, watchReducedMotionPreference } from './motion.js';
import { installAtmosphereDrift, installPerformanceTuning } from './performance-tuning.js';
import { readReleaseMeta } from './release.js';
import { routeFromHref, routeFromPathname } from './router-lite.js';
import { installRuntimeControl } from './runtime-control.js';
import { installWorkbenchParserAdapter } from './spwlang-parser.js';
import { createStore } from './store.js';
import { installStructureMode } from './structure-mode.js';
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

function syncRootStateAttributes(nextState) {
  const root = document.documentElement;
  root.dataset.route = nextState.activeRoute;
  root.dataset.phase = nextState.phase;
  root.dataset.clickCount = String(nextState.clickCount);
  root.dataset.reducedMotion = nextState.reducedMotion ? 'true' : 'false';
}

function syncLiteratureAttributes(marginalia) {
  document.documentElement.dataset.marginaliaLines = String(marginalia.count());
}

function bridgeStoreToEvents(app) {
  return app.store.subscribe((nextState, previousState, reason) => {
    syncRootStateAttributes(nextState);

    app.ecology.setRoute(nextState.activeRoute);
    app.ecology.setPhase(nextState.phase);

    app.marginalia.write('state', `Transition: ${reason}`, {
      route: nextState.activeRoute,
      phase: nextState.phase,
      clickCount: nextState.clickCount
    });
    syncLiteratureAttributes(app.marginalia);

    dispatchTypedEvent(window, EVENT_STATE_CHANGED, {
      prev: previousState,
      next: nextState,
      reason
    });

    if (previousState.phase !== nextState.phase) {
      dispatchTypedEvent(window, EVENT_PHASE_CHANGED, {
        phase: nextState.phase,
        clickCount: nextState.clickCount
      });
    }
  });
}

function bridgeEcologyToEvents(app) {
  return app.ecology.subscribe((nextSnapshot, previousSnapshot, reason) => {
    document.documentElement.dataset.ecologyReason = reason;
    document.documentElement.dataset.ecologySpeciesCount = String(
      Object.keys(nextSnapshot.species).length
    );

    dispatchTypedEvent(window, EVENT_ECOLOGY_CHANGED, {
      prev: previousSnapshot,
      next: nextSnapshot,
      reason
    });
  });
}

function installIntentListeners(app) {
  const removeIntentListener = subscribeTypedEvent(window, EVENT_INTENT_CLICK, (event) => {
    const source = event.detail?.source ?? 'unknown';
    app.store.registerClick(source);
  });

  const removeNavigateListener = subscribeTypedEvent(window, EVENT_NAVIGATE, (event) => {
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

function initializePage(routeName, app) {
  const initPage = PAGE_INITIALIZERS[routeName] ?? PAGE_INITIALIZERS.home;
  const manifest = CONTENT_MANIFESTS[routeName] ?? CONTENT_MANIFESTS.home;

  app.marginalia.write('page', `Initialize route ${routeName}`, {
    manifestTitle: manifest.metaTitle
  });
  syncLiteratureAttributes(app.marginalia);

  initPage({
    route: routeName,
    store: app.store,
    manifest,
    document
  });
}

function createApp() {
  const activeRoute = routeFromPathname(window.location.pathname);
  const reducedMotion = detectReducedMotionPreference(window);
  const releaseMeta = readReleaseMeta(document);
  const store = createStore({ activeRoute, reducedMotion });
  const ecology = createEcologyLedger();
  const marginalia = createMarginaliaLedger();
  const structureController = installStructureMode(document, window);
  const performanceController = installPerformanceTuning(document, window, {
    reducedMotion,
    onProfileChange(nextProfile, nextConfig) {
      marginalia.write('performance', `Profile applied: ${nextProfile}`, {
        profile: nextProfile,
        frameRate: nextConfig.frameRate
      });
      syncLiteratureAttributes(marginalia);
    }
  });

  const app = {
    route: activeRoute,
    releaseMeta,
    store,
    ecology,
    marginalia,
    structureController,
    performanceController,
    enhancementRuntime: null,
    runtimeControlCleanup: null,
    destroy() {
      if (this.enhancementRuntime) {
        this.enhancementRuntime.cleanup();
      }

      if (this.runtimeControlCleanup) {
        this.runtimeControlCleanup();
        this.runtimeControlCleanup = null;
      }

      for (const cleanup of cleanups) {
        cleanup();
      }
      cleanups.length = 0;
    }
  };

  syncRootStateAttributes(store.getState());
  document.documentElement.dataset.releaseDate = releaseMeta.releaseDate;
  document.documentElement.dataset.releaseId = releaseMeta.releaseId;
  document.documentElement.dataset.releaseArc = releaseMeta.releaseArc;
  document.documentElement.dataset.releaseVibe = releaseMeta.releaseVibe;
  document.documentElement.dataset.assetVersion = releaseMeta.assetVersion;
  document.documentElement.dataset.llmReadableStructure = structureController.enabled ? 'true' : 'false';
  document.documentElement.dataset.performanceProfile = performanceController.getProfile();
  ecology.setRoute(activeRoute);
  ecology.setPhase(store.getState().phase);

  marginalia.write('boot', 'Create app container', {
    route: activeRoute,
    reducedMotion,
    releaseDate: releaseMeta.releaseDate,
    releaseId: releaseMeta.releaseId,
    releaseArc: releaseMeta.releaseArc,
    releaseVibe: releaseMeta.releaseVibe,
    performanceProfile: performanceController.getProfile()
  });
  syncLiteratureAttributes(marginalia);

  const cleanups = [];
  cleanups.push(installAccessibilityEnhancements(document));
  cleanups.push(bridgeStoreToEvents(app));
  cleanups.push(bridgeEcologyToEvents(app));
  cleanups.push(installIntentListeners(app));
  cleanups.push(() => structureController.destroy());
  cleanups.push(() => performanceController.destroy());
  cleanups.push(installAtmosphereDrift(document, window, performanceController));
  cleanups.push(
    watchReducedMotionPreference(window, (nextReducedMotion) => {
      app.store.setReducedMotion(nextReducedMotion);
    })
  );

  return app;
}

async function bootstrap() {
  if (window.__SPW_APP__) {
    return;
  }

  const app = createApp();
  window.__SPW_APP__ = app;

  const parserBridge = await installWorkbenchParserAdapter({
    assetVersion: app.releaseMeta.assetVersion
  });
  app.marginalia.write('parser', 'Spw parser bridge status', parserBridge);
  syncLiteratureAttributes(app.marginalia);

  const textureTuner = await app.performanceController.loadTextureTuner({
    assetVersion: app.releaseMeta.assetVersion
  });
  app.marginalia.write('texture', 'Texture tuner status', textureTuner);
  syncLiteratureAttributes(app.marginalia);

  defineAllComponents(app.ecology);
  initializePage(app.route, app);
  app.runtimeControlCleanup = installRuntimeControl({
    app,
    document,
    window,
    rebindPage() {
      const route = app.store.getState().activeRoute;
      initializePage(route, app);
    }
  });

  app.enhancementRuntime = { manifest: { profile: 'baseline', enhancements: [] }, cleanups: [] };

  // Defer enhancement loading to not block initial rendering.
  // Using setTimeout with 0 delay allows the browser to complete the current event loop,
  // render the page, and process user interactions before loading optional enhancements.
  // This improves First Contentful Paint (FCP) and Time to Interactive (TTI).
  // requestIdleCallback would be ideal but isn't supported in Safari as of 2026.
  setTimeout(() => {
    runIterativeEnhancements({
      app,
      route: app.route,
      document
    }).then((enhancementRuntime) => {
      app.enhancementRuntime = enhancementRuntime;
      app.marginalia.write('enhancement', 'Iterative enhancement stage complete', {
        profile: enhancementRuntime.manifest.profile,
        count: enhancementRuntime.manifest.enhancements.length
      });
      syncLiteratureAttributes(app.marginalia);
    }).catch((error) => {
      console.warn('Enhancement loading failed, continuing with baseline', error);
    });
  }, 0);

  dispatchTypedEvent(window, EVENT_APP_READY, {
    route: app.route,
    state: app.store.getState(),
    ecology: app.ecology.getSnapshot(),
    profile: app.enhancementRuntime.manifest.profile,
    release: app.releaseMeta,
    llmReadableStructure: app.structureController.enabled,
    performanceProfile: app.performanceController.getProfile(),
    textureTunerState: document.documentElement.dataset.textureTunerState ?? 'unknown'
  });
}

/**
 * Shows a user-visible error message when bootstrap fails.
 */
function showBootFailureMessage() {
  const fallback = document.createElement('div');
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
  document.body.prepend(fallback);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    bootstrap().catch((error) => {
      console.error('Boot failed', error);
      showBootFailureMessage();
    });
  }, { once: true });
} else {
  bootstrap().catch((error) => {
    console.error('Boot failed', error);
    showBootFailureMessage();
  });
}
