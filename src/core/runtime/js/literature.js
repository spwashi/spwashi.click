const DEFAULT_LIMIT = 160;

function freezeEntry(entry) {
  return Object.freeze({
    at: entry.at,
    section: entry.section,
    message: entry.message,
    detail: Object.freeze({ ...(entry.detail ?? {}) })
  });
}

export function createMarginaliaLedger(limit = DEFAULT_LIMIT) {
  const entries = [];

  return {
    write(section, message, detail = {}) {
      const nextEntry = freezeEntry({
        at: new Date().toISOString(),
        section,
        message,
        detail
      });

      entries.push(nextEntry);
      if (entries.length > limit) {
        entries.splice(0, entries.length - limit);
      }

      return nextEntry;
    },

    read(maxEntries = entries.length) {
      const count = Math.max(0, Math.floor(maxEntries));
      return Object.freeze(entries.slice(-count));
    },

    count() {
      return entries.length;
    }
  };
}
