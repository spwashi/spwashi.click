/**
 * Intent:
 * Model the site's web-component ecology as a first-class runtime ledger so relationships and health stay observable.
 * Invariants:
 * Species metadata is immutable, and lifecycle notes are append-only counters keyed by component tag names.
 * How this composes with neighbors:
 * Boot owns the ledger lifecycle, component classes emit lifecycle notes, and ecology-map renders snapshots.
 */

const INITIAL_LIFECYCLE_COUNTS = Object.freeze({
  connected: 0,
  disconnected: 0,
  rendered: 0,
  intent: 0
});

export const CORE_SPECIES = Object.freeze([
  Object.freeze({
    tagName: 'spw-site-shell',
    role: 'habitat',
    dependsOn: Object.freeze([]),
    emits: Object.freeze(['spw:navigate'])
  }),
  Object.freeze({
    tagName: 'spw-click-stage',
    role: 'performer',
    dependsOn: Object.freeze(['spw-rhythm-grid']),
    emits: Object.freeze(['spw:intent:click'])
  }),
  Object.freeze({
    tagName: 'spw-rhythm-grid',
    role: 'metronome',
    dependsOn: Object.freeze([]),
    emits: Object.freeze([])
  }),
  Object.freeze({
    tagName: 'spw-chapter-panel',
    role: 'narrator',
    dependsOn: Object.freeze([]),
    emits: Object.freeze([])
  }),
  Object.freeze({
    tagName: 'spw-ecology-map',
    role: 'observer',
    dependsOn: Object.freeze(['spw-site-shell']),
    emits: Object.freeze([])
  }),
  Object.freeze({
    tagName: 'spw-syntax-lab',
    role: 'explorer',
    dependsOn: Object.freeze(['spw-click-stage']),
    emits: Object.freeze([])
  })
]);

function normalizeTagName(tagName) {
  if (typeof tagName !== 'string' || tagName.length === 0) {
    return 'unknown-species';
  }

  return tagName.toLowerCase();
}

function freezeSnapshot(candidateSnapshot) {
  const speciesEntries = Object.entries(candidateSnapshot.species).map(([tagName, speciesState]) => {
    const clonedSpeciesState = {
      ...speciesState,
      counts: Object.freeze({ ...speciesState.counts }),
      dependsOn: Object.freeze([...speciesState.dependsOn]),
      emits: Object.freeze([...speciesState.emits])
    };

    return [tagName, Object.freeze(clonedSpeciesState)];
  });

  return Object.freeze({
    phase: candidateSnapshot.phase,
    route: candidateSnapshot.route,
    lastReason: candidateSnapshot.lastReason,
    species: Object.freeze(Object.fromEntries(speciesEntries))
  });
}

function createSpeciesState(speciesSeed) {
  return {
    role: speciesSeed.role ?? 'unknown',
    dependsOn: [...(speciesSeed.dependsOn ?? [])],
    emits: [...(speciesSeed.emits ?? [])],
    lastLifecycle: 'unseen',
    lastDetail: Object.freeze({}),
    counts: { ...INITIAL_LIFECYCLE_COUNTS }
  };
}

export function createEcologyLedger(seedSpecies = CORE_SPECIES) {
  const listeners = new Set();
  let snapshot = freezeSnapshot({
    phase: 'seed',
    route: 'home',
    lastReason: 'bootstrap',
    species: {}
  });

  function notify(nextSnapshot, previousSnapshot, reason) {
    for (const listener of listeners) {
      listener(nextSnapshot, previousSnapshot, reason);
    }
  }

  function mutate(mutator, reason) {
    const draft = {
      ...snapshot,
      species: Object.fromEntries(
        Object.entries(snapshot.species).map(([tagName, speciesState]) => [
          tagName,
          {
            ...speciesState,
            counts: { ...speciesState.counts },
            dependsOn: [...speciesState.dependsOn],
            emits: [...speciesState.emits],
            lastDetail: { ...speciesState.lastDetail }
          }
        ])
      )
    };

    mutator(draft);
    draft.lastReason = reason;
    const previousSnapshot = snapshot;
    snapshot = freezeSnapshot(draft);
    notify(snapshot, previousSnapshot, reason);
    return snapshot;
  }

  function ensureSpecies(tagName, speciesSeed = {}) {
    const normalizedTagName = normalizeTagName(tagName);

    if (!snapshot.species[normalizedTagName]) {
      mutate((draft) => {
        draft.species[normalizedTagName] = createSpeciesState(speciesSeed);
      }, 'species:register');
    }

    return normalizedTagName;
  }

  for (const species of seedSpecies) {
    ensureSpecies(species.tagName, species);
  }

  return {
    getSnapshot() {
      return snapshot;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    registerSpecies(species) {
      ensureSpecies(species.tagName, species);
      return this.getSnapshot();
    },

    setPhase(phaseName) {
      mutate((draft) => {
        draft.phase = phaseName;
      }, 'phase:set');
      return snapshot;
    },

    setRoute(routeName) {
      mutate((draft) => {
        draft.route = routeName;
      }, 'route:set');
      return snapshot;
    },

    noteLifecycle(tagName, lifecycle, detail = {}) {
      const normalizedTagName = ensureSpecies(tagName);

      mutate((draft) => {
        const speciesState = draft.species[normalizedTagName];
        speciesState.lastLifecycle = lifecycle;
        speciesState.lastDetail = { ...detail };
        speciesState.counts[lifecycle] = (speciesState.counts[lifecycle] ?? 0) + 1;
      }, `lifecycle:${normalizedTagName}:${lifecycle}`);

      return snapshot;
    }
  };
}

export function noteComponentLifecycle(tagName, lifecycle, detail = {}) {
  const app = globalThis.window?.__SPW_APP__;
  if (!app?.ecology) {
    return;
  }

  app.ecology.noteLifecycle(tagName, lifecycle, detail);
}
