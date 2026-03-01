const STORAGE_KEY = 'spw:settings:performance-profile';
const QUERY_KEY = 'perf';
const TEXTURE_CACHE_FALLBACK_ORIGIN = 'https://tealstripesvibes.com';

const PROFILE_ORDER = Object.freeze(['seed', 'field', 'maximal']);

const PROFILE_CONFIG = Object.freeze({
  seed: Object.freeze({
    motionGain: 0.18,
    lightDepth: 0.38,
    textureGain: 0.16,
    blurPx: 4,
    shadowGain: 0.52,
    grainAlpha: 0.025,
    frameRate: 12
  }),
  field: Object.freeze({
    motionGain: 0.56,
    lightDepth: 0.68,
    textureGain: 0.42,
    blurPx: 18,
    shadowGain: 1,
    grainAlpha: 0.06,
    frameRate: 30
  }),
  maximal: Object.freeze({
    motionGain: 0.9,
    lightDepth: 1,
    textureGain: 0.74,
    blurPx: 28,
    shadowGain: 1.4,
    grainAlpha: 0.1,
    frameRate: 60
  })
});

function coerceProfile(value) {
  return PROFILE_ORDER.includes(value) ? value : 'field';
}

function profileFromQuery(win) {
  try {
    const url = new URL(win.location.href);
    return coerceProfile(url.searchParams.get(QUERY_KEY));
  } catch {
    return null;
  }
}

function profileFromStorage(win) {
  try {
    return coerceProfile(win.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function detectProfile(win, reducedMotion) {
  if (reducedMotion) {
    return 'seed';
  }

  const fromQuery = profileFromQuery(win);
  if (fromQuery) {
    return fromQuery;
  }

  const fromStorage = profileFromStorage(win);
  if (fromStorage) {
    return fromStorage;
  }

  const cpuCores = Number.isFinite(win.navigator?.hardwareConcurrency)
    ? win.navigator.hardwareConcurrency
    : 4;

  if (cpuCores <= 4) {
    return 'seed';
  }

  if (cpuCores >= 10) {
    return 'maximal';
  }

  return 'field';
}

function saveProfile(win, profile) {
  try {
    win.localStorage.setItem(STORAGE_KEY, profile);
  } catch {
    // ^fallback[persist]{ localstorage:optional mode:session-only }
  }
}

function readTextureCacheOrigin(doc) {
  const originMeta = doc
    .querySelector('meta[name="spw:texture-cache-origin"]')
    ?.getAttribute('content');

  if (typeof originMeta === 'string' && originMeta.length > 0) {
    return originMeta;
  }

  return TEXTURE_CACHE_FALLBACK_ORIGIN;
}

function sanitizeNumber(value, fallbackValue) {
  const parsed = Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) {
    return fallbackValue;
  }

  return parsed;
}

function syncToggleLabels(doc, profile, textureTunerState) {
  const nodes = doc.querySelectorAll('[data-role="performance-toggle"]');
  for (const node of nodes) {
    node.setAttribute('aria-label', `Cycle performance profile. Current profile: ${profile}`);
    node.textContent = `^perf{ profile: ${profile} tuner: ${textureTunerState} }`;
  }
}

export function installPerformanceTuning(
  doc = globalThis.document,
  win = globalThis.window,
  options = {}
) {
  if (!doc || !win) {
    return {
      getProfile: () => 'field',
      setProfile: () => {},
      getConfig: () => PROFILE_CONFIG.field,
      destroy: () => {}
    };
  }

  const reducedMotion = options.reducedMotion === true;
  let profile = detectProfile(win, reducedMotion);
  let textureTunerState = 'idle';
  const textureCacheOrigin = readTextureCacheOrigin(doc);
  const profileOverrides = {
    seed: {},
    field: {},
    maximal: {}
  };

  const root = doc.documentElement;

  function resolvedConfig(nextProfile) {
    return {
      ...PROFILE_CONFIG[nextProfile],
      ...profileOverrides[nextProfile]
    };
  }

  function apply(nextProfile) {
    profile = coerceProfile(nextProfile);
    root.dataset.performanceProfile = profile;
    root.dataset.textureTunerState = textureTunerState;
    root.dataset.textureCacheOrigin = textureCacheOrigin;
    const config = resolvedConfig(profile);
    root.style.setProperty('--fx-motion-gain', String(config.motionGain));
    root.style.setProperty('--fx-light-depth', String(config.lightDepth));
    root.style.setProperty('--fx-texture-gain', String(config.textureGain));
    root.style.setProperty('--fx-blur-px', String(config.blurPx));
    root.style.setProperty('--fx-shadow-gain', String(config.shadowGain));
    root.style.setProperty('--fx-grain-alpha', String(config.grainAlpha));
    syncToggleLabels(doc, profile, textureTunerState);
    saveProfile(win, profile);
    options.onProfileChange?.(profile, config);
  }

  function cycleProfile() {
    const index = PROFILE_ORDER.indexOf(profile);
    const nextProfile = PROFILE_ORDER[(index + 1) % PROFILE_ORDER.length];
    apply(nextProfile);
  }

  function onClick(event) {
    const target = event.target;
    if (!target || typeof target.closest !== 'function') {
      return;
    }

    if (target.closest('[data-role="performance-toggle"]')) {
      cycleProfile();
    }
  }

  doc.addEventListener('click', onClick);
  apply(profile);

  return {
    getProfile() {
      return profile;
    },
    getConfig() {
      return resolvedConfig(profile);
    },
    setProfile(nextProfile) {
      apply(nextProfile);
    },
    async loadTextureTuner({ assetVersion = '' } = {}) {
      const endpoint = `${textureCacheOrigin}/spw-cache/texture-tuner.v1.json?v=${encodeURIComponent(assetVersion)}`;
      textureTunerState = 'loading';
      apply(profile);

      try {
        const response = await win.fetch(endpoint, { mode: 'cors', cache: 'no-store' });
        if (!response.ok) {
          textureTunerState = 'unavailable';
          apply(profile);
          return { state: textureTunerState, endpoint };
        }

        const payload = await response.json();
        for (const profileName of PROFILE_ORDER) {
          const rawConfig = payload?.profiles?.[profileName] ?? {};
          profileOverrides[profileName] = {
            motionGain: sanitizeNumber(rawConfig.motionGain, PROFILE_CONFIG[profileName].motionGain),
            lightDepth: sanitizeNumber(rawConfig.lightDepth, PROFILE_CONFIG[profileName].lightDepth),
            textureGain: sanitizeNumber(rawConfig.textureGain, PROFILE_CONFIG[profileName].textureGain),
            blurPx: sanitizeNumber(rawConfig.blurPx, PROFILE_CONFIG[profileName].blurPx),
            shadowGain: sanitizeNumber(rawConfig.shadowGain, PROFILE_CONFIG[profileName].shadowGain),
            grainAlpha: sanitizeNumber(rawConfig.grainAlpha, PROFILE_CONFIG[profileName].grainAlpha),
            frameRate: sanitizeNumber(rawConfig.frameRate, PROFILE_CONFIG[profileName].frameRate)
          };
        }

        textureTunerState = 'ready';
        apply(profile);
        return { state: textureTunerState, endpoint };
      } catch {
        textureTunerState = 'offline';
        apply(profile);
        return { state: textureTunerState, endpoint };
      }
    },
    destroy() {
      doc.removeEventListener('click', onClick);
    }
  };
}

function phaseWeight(phase) {
  if (phase === 'chorus') {
    return 1.2;
  }

  if (phase === 'counterpoint') {
    return 0.95;
  }

  if (phase === 'pulse') {
    return 0.78;
  }

  return 0.6;
}

export function installAtmosphereDrift(
  doc = globalThis.document,
  win = globalThis.window,
  tuningController = null
) {
  if (!doc || !win || typeof win.requestAnimationFrame !== 'function') {
    return () => {};
  }

  const root = doc.documentElement;
  let frameHandle = 0;
  let lastFrameMs = 0;

  function tick(nowMs) {
    const config = tuningController?.getConfig?.() ?? PROFILE_CONFIG.field;

    if (root.dataset.reducedMotion === 'true') {
      frameHandle = win.requestAnimationFrame(tick);
      return;
    }

    const frameInterval = 1000 / (config.frameRate || 30);
    if (nowMs - lastFrameMs < frameInterval) {
      frameHandle = win.requestAnimationFrame(tick);
      return;
    }

    lastFrameMs = nowMs;

    const time = nowMs / 1000;
    const phase = root.dataset.phase ?? 'seed';
    const phaseGain = phaseWeight(phase);
    const amplitude = 20 * config.motionGain * phaseGain;

    const driftX = (Math.sin(time * 0.37) + Math.cos(time * 0.18)) * amplitude;
    const driftY = (Math.cos(time * 0.31) - Math.sin(time * 0.23)) * amplitude * 0.66;
    const lumenAngle = 130 + Math.sin(time * 0.09) * 44 * config.motionGain;

    root.style.setProperty('--fx-drift-x', `${driftX.toFixed(3)}px`);
    root.style.setProperty('--fx-drift-y', `${driftY.toFixed(3)}px`);
    root.style.setProperty('--fx-lumen-angle', `${lumenAngle.toFixed(3)}deg`);

    frameHandle = win.requestAnimationFrame(tick);
  }

  frameHandle = win.requestAnimationFrame(tick);

  return () => {
    win.cancelAnimationFrame(frameHandle);
  };
}
