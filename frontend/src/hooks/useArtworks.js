import { useEffect, useState } from "react";
import { fetchArtworks } from "../api/client";
import localCatalog from "../data/catalog_cleaned.json";

// Module-level cache so moving between pages doesn't refetch.
let cache = null;

/** Call after an admin edit so the public pages load the new data. */
export function clearArtworksCache() {
  cache = null;
}

/**
 * Returns the catalog from the backend API. It starts with the bundled JSON so
 * pages render instantly (and keep working if the API is asleep or down), then
 * swaps in the live data. Field names match catalog_cleaned.json, plus
 * price, status, image_url and sort_order.
 */
export function useArtworks() {
  const [artworks, setArtworks] = useState(cache ?? localCatalog);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) return;
    const controller = new AbortController();

    fetchArtworks({}, { signal: controller.signal })
      .then((list) => {
        if (list.length) {
          cache = list;
          setArtworks(list);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.warn("API unavailable, using bundled catalog:", err);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return { artworks, loading };
}
