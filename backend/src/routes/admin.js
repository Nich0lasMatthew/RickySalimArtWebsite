import { randomUUID } from "node:crypto";
import express, { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { detectImageType } from "../images/cloudinary.js";
import { requireAdmin } from "../middleware/auth.js";
import {
  COLLECTIONS,
  STATUSES,
  fieldErrors,
  price,
  safeText,
  season,
  slugify,
  validId,
  year,
} from "../validation.js";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Images may only point at our own hosting (or the old bundled files). */
function isAllowedImage(url, imageStore) {
  if (imageStore?.owns(url)) return true;
  // Ricky's existing Beacons site (Season 1 cards) until they're moved to Cloudinary.
  if (/^https:\/\/cdn\.beacons\.ai\/user_content\/dzsXJzxR7FYk9kHk9kzReITqCk32\/referenced_images\/[\w.-]+\.(jpe?g|png|webp)$/i.test(url)) return true;
  if (/^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/[^?#]+\?alt=media(&token=[\w-]+)?$/.test(url)) return true;
  return /^\/artworks\/[a-z0-9_-]+(\/[a-z0-9_.-]+)+\.(jpe?g|png|webp)$/i.test(url);
}

function artworkFields(imageStore) {
  return {
    title: safeText({ max: 120, min: 1, required: "Please enter a title" }),
    collection: z.enum(COLLECTIONS, { error: "Choose a collection" }),
    year,
    size: safeText({ max: 60 }),
    medium: safeText({ max: 100 }),
    description: safeText({ max: 5000, multiline: true }),
    prophetic_word: safeText({ max: 5000, multiline: true }),
    scripture_reference: safeText({ max: 120 }),
    price,
    season,
    status: z.enum(STATUSES, { error: "Choose available, reserved or sold" }),
    image_url: z
      .string({ error: "Please upload an image" })
      .max(2000)
      .refine((url) => isAllowedImage(url, imageStore), "Please upload the image using the form"),
  };
}

const enquiryPatch = z.object({ handled: z.boolean() }).strict();

function badRequest(res, error) {
  return res.status(400).json({ error: "Please check the highlighted fields", fields: fieldErrors(error) });
}

/** Everything under /api/admin requires the admin claim. */
export function adminRouter({ db, store, imageStore }) {
  const router = Router();
  router.use(requireAdmin);
  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  router.param("id", validId);

  const fields = artworkFields(imageStore);
  const createSchema = z.object(fields).partial().required({ title: true, collection: true, image_url: true }).strict();
  const patchSchema = z
    .object(fields)
    .partial()
    .strict()
    .refine((o) => Object.keys(o).length > 0, "Nothing to update");

  const artworks = db.collection("artworks");

  // ---- enquiries -----------------------------------------------------------

  router.get("/enquiries", async (_req, res) => {
    const snap = await db.collection("enquiries").orderBy("createdAt", "desc").limit(200).get();
    const enquiries = snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data, createdAt: data.createdAt?.toDate?.().toISOString() ?? null };
    });
    res.json({ enquiries });
  });

  router.patch("/enquiries/:id", async (req, res) => {
    const parsed = enquiryPatch.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "Invalid update" });
    const ref = db.collection("enquiries").doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: "Not found" });
    await ref.update(parsed.data);
    res.json({ ok: true });
  });

  // ---- images --------------------------------------------------------------

  // POST /api/admin/images  (body = the raw image file)  -> { url, width, height }
  router.post(
    "/images",
    express.raw({ type: () => true, limit: MAX_IMAGE_BYTES }),
    async (req, res) => {
      if (!imageStore) {
        return res.status(503).json({ error: "Image uploads aren't set up yet (CLOUDINARY_URL is missing on the server)." });
      }
      const buf = req.body;
      if (!Buffer.isBuffer(buf) || buf.length === 0) {
        return res.status(400).json({ error: "No image received" });
      }
      // Trust the bytes, not the file name or the browser's claimed type.
      // SVG is deliberately not allowed: it can contain scripts.
      const type = detectImageType(buf);
      if (!type) return res.status(415).json({ error: "Please upload a JPEG, PNG or WebP image" });

      const name = slugify(typeof req.query.name === "string" ? req.query.name : "artwork");
      const publicId = `artworks/uploads/${name}-${randomUUID().slice(0, 8)}`;
      const result = await imageStore.upload(buf, { contentType: type, publicId });
      res.status(201).json(result);
    }
  );

  // ---- artworks ------------------------------------------------------------

  // POST /api/admin/artworks  -> { artwork }
  router.post("/artworks", async (req, res) => {
    const parsed = createSchema.safeParse(req.body ?? {});
    if (!parsed.success) return badRequest(res, parsed.error);
    const input = parsed.data;

    // A readable id from the title, made unique.
    const base = slugify(input.title);
    let id = base;
    for (let n = 2; (await artworks.doc(id).get()).exists; n++) {
      if (n > 50) return res.status(409).json({ error: "Too many artworks with this title" });
      id = `${base}-${n}`;
    }

    const all = await store.list();
    const sortOrder = all.reduce((m, a) => Math.max(m, Number(a.sort_order) || 0), -1) + 1;

    const artwork = {
      title: input.title,
      artist: "Ricky B. Salim",
      collection: input.collection,
      year: input.year ?? "",
      size: input.size ?? "",
      medium: input.medium ?? "",
      description: input.description ?? "",
      prophetic_word: input.prophetic_word ?? "",
      scripture_reference: input.scripture_reference ?? "",
      price: input.price ?? null,
      season: input.collection === "Carrot Cards" ? input.season ?? null : null,
      status: input.status ?? "available",
      image_url: input.image_url,
      sort_order: sortOrder,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: req.user.email ?? req.user.uid,
    };
    await artworks.doc(id).set(artwork);
    store.invalidate();

    const { createdAt: _c, ...rest } = artwork;
    res.status(201).json({ artwork: { id, ...rest } });
  });

  // PATCH /api/admin/artworks/:id  { any of the fields above }
  router.patch("/artworks/:id", async (req, res) => {
    const parsed = patchSchema.safeParse(req.body ?? {});
    if (!parsed.success) return badRequest(res, parsed.error);
    const ref = artworks.doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: "Not found" });

    await ref.update({
      ...parsed.data,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: req.user.email ?? req.user.uid,
    });
    store.invalidate(); // so the public site shows the change straight away
    res.json({ ok: true });
  });

  // DELETE /api/admin/artworks/:id
  router.delete("/artworks/:id", async (req, res) => {
    const ref = artworks.doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: "Not found" });
    await ref.delete();
    store.invalidate();
    res.json({ ok: true });
  });

  return router;
}
