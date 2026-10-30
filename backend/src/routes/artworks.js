import { Router } from "express";
import { validId } from "../validation.js";

const asString = (value) => (typeof value === "string" ? value : undefined);

export function artworksRouter(store) {
  const router = Router();
  router.param("id", validId);

  // GET /api/artworks?collection=Carrot%20Cards&status=available
  router.get("/", async (req, res) => {
    const artworks = await store.list({
      collection: asString(req.query.collection),
      status: asString(req.query.status),
    });
    res.set("Cache-Control", "public, max-age=60");
    res.json({ artworks });
  });

  // GET /api/artworks/:id
  router.get("/:id", async (req, res) => {
    const artwork = await store.get(req.params.id);
    if (!artwork) return res.status(404).json({ error: "Artwork not found" });
    res.set("Cache-Control", "public, max-age=60");
    res.json({ artwork });
  });

  return router;
}
