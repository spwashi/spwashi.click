import { EVENT_PWA_STATE_CHANGED, dispatchTypedEvent } from './events.js';
import { resolveRuntimeAssetUrl } from './runtime-config.js';

function isServiceWorkerSupported(win = globalThis.window) {
  return Boolean(win?.navigator?.serviceWorker);
}

function normalizeState(value) {
  const text = String(value ?? '').trim();
  if (!text) {
    return 'idle';
  }

  return text;
}

function networkState(win = globalThis.window) {
  if (!win || typeof win.navigator?.onLine !== 'boolean') {
    return 'unknown';
  }

  return win.navigator.onLine ? 'online' : 'offline';
}

function serviceWorkerScope(runtimeConfig = {}) {
  const baseUrl = String(runtimeConfig.baseUrl ?? '/').trim();
  if (/^https?:\/\//i.test(baseUrl)) {
    try {
      const pathname = new URL(baseUrl).pathname;
      return pathname.endsWith('/') ? pathname : `${pathname}/`;
    } catch {
      return '/';
    }
  }

  if (!baseUrl) {
    return '/';
  }

  const normalized = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`;
  return normalized.endsWith('/') ? normalized : `${normalized}/`;
}

function setRootState(doc, nextState, details = {}) {
  const root = doc?.documentElement;
  if (!root) {
    return;
  }

  root.dataset.pwaState = normalizeState(nextState);
  root.dataset.networkState = networkState(doc.defaultView ?? globalThis.window);

  if (details.scope) {
    root.dataset.pwaScope = String(details.scope);
  }

  if (details.reason) {
    root.dataset.pwaReason = String(details.reason);
  }
}

export function installPwaSupport({
  document: doc,
  window: win,
  releaseMeta,
  runtimeConfig = {},
  onStateChange
} = {}) {
  if (!doc || !win) {
    return {
      supported: false,
      getSnapshot() {
        return { state: 'unavailable', network: 'unknown', scope: '' };
      },
      async activateUpdate() {
        return false;
      },
      destroy() {}
    };
  }

  const assetVersion = releaseMeta?.assetVersion ?? 'dev';
  const workerUrl = resolveRuntimeAssetUrl('/sw.js', runtimeConfig, { assetVersion });
  const scope = serviceWorkerScope(runtimeConfig);
  const snapshot = {
    state: 'idle',
    network: networkState(win),
    scope: ''
  };

  let registration = null;

  function emit(nextState, details = {}) {
    snapshot.state = normalizeState(nextState);
    snapshot.network = networkState(win);
    snapshot.scope = typeof details.scope === 'string' ? details.scope : snapshot.scope;
    setRootState(doc, snapshot.state, { ...details, scope: snapshot.scope });
    onStateChange?.({ ...snapshot, ...details });
    dispatchTypedEvent(win, EVENT_PWA_STATE_CHANGED, {
      ...snapshot,
      ...details
    });
  }

  function onOnline() {
    emit(snapshot.state, { reason: 'network:online' });
  }

  function onOffline() {
    emit(snapshot.state, { reason: 'network:offline' });
  }

  function onControllerChange() {
    emit('ready', { reason: 'controller:changed', scope: registration?.scope ?? snapshot.scope });
  }

  win.addEventListener('online', onOnline);
  win.addEventListener('offline', onOffline);

  if (!isServiceWorkerSupported(win)) {
    emit('unsupported', { reason: 'service-worker:missing' });
    return {
      supported: false,
      getSnapshot() {
        return { ...snapshot };
      },
      async activateUpdate() {
        return false;
      },
      destroy() {
        win.removeEventListener('online', onOnline);
        win.removeEventListener('offline', onOffline);
      }
    };
  }

  emit('registering', { reason: 'service-worker:register-start' });
  win.navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

  (async () => {
    try {
      registration = await win.navigator.serviceWorker.register(workerUrl, { scope });
      emit('ready', {
        reason: 'service-worker:registered',
        scope: registration.scope
      });

      if (registration.waiting) {
        emit('update-ready', {
          reason: 'service-worker:waiting',
          scope: registration.scope
        });
      }

      registration.addEventListener('updatefound', () => {
        emit('updating', {
          reason: 'service-worker:update-found',
          scope: registration?.scope ?? snapshot.scope
        });
      });
    } catch (error) {
      emit('error', {
        reason: error instanceof Error ? error.message : 'service-worker:register-failed'
      });
    }
  })();

  return {
    supported: true,
    getSnapshot() {
      return { ...snapshot };
    },
    async activateUpdate() {
      if (!registration?.waiting) {
        return false;
      }

      registration.waiting.postMessage({ type: 'SPW_SW_ACTIVATE' });
      return true;
    },
    destroy() {
      win.removeEventListener('online', onOnline);
      win.removeEventListener('offline', onOffline);
      win.navigator.serviceWorker?.removeEventListener?.('controllerchange', onControllerChange);
    }
  };
}
