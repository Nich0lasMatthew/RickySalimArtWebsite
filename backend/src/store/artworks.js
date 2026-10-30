const DEFAULT_TTL_MS = 60_000;

/**
 * Reads the whole catalog (it is small) and keeps it in memory for a minute,
 * so page views don't turn into Firestore reads. Filtering is done in memory,
 * which also avoids needing composite indexes.
 */
export function createArtworkStore(
  db,
  { ttlMs = DEFAULT_TTL_MS, now = Date.now } = {}
) {
  let cached = null;
  let cachedAt = 0;
  let inflight = null;

  async function loadAll() {
    if (cached && now() - cachedAt < ttlMs) return cached;

    inflight ??= db
      .collection("artworks")
      .orderBy("sort_order")
      .get()
      .then((snap) => {
        cached = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        cachedAt = now();
        return cached;
      })
      .finally(() => {
        inflight = null;
      });

    try {
      return await inflight;
    } catch (err) {
      if (cached) return cached; // serve stale data rather than failing
      throw err;
    }
  }

  return {
    invalidate() {
      cached = null;
      cachedAt = 0;
    },

    async list({ collection, status } = {}) {
      const all = await loadAll();
      return all.filter(
        (a) =>
          (!collection || a.collection === collection) &&
          (!status || a.status === status)
      );
    },

    async get(id) {
      const all = await loadAll();
      return all.find((a) => a.id === id) ?? null;
    },
  };
}
