import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { requireAdmin } from "../middleware/auth.js";

const artworkPatch = z
  .object({
    title: z.string().trim().min(1).max(200),
    price: z.number().nonnegative().max(1_000_000).nullable(), // AUD
    status: z.enum(["available", "reserved", "sold"]),
    description: z.string().max(5000),
    prophetic_word: z.string().max(5000),
    scripture_reference: z.string().max(200),
    medium: z.string().max(200),
    size: z.string().max(100),
    year: z.string().max(10),
    image_url: z.url().max(2000),
  })
  .partial()
  .strict();

const enquiryPatch = z.object({ handled: z.boolean() }).strict();

/** Everything under /api/admin requires the admin claim. */
export function adminRouter({ db, store }) {
  const router = Router();
  router.use(requireAdmin);
  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  // GET /api/admin/enquiries - newest first
  router.get("/enquiries", async (_req, res) => {
    const snap = await db
      .collection("enquiries")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();
    const enquiries = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
      };
    });
    res.json({ enquiries });
  });

  // PATCH /api/admin/enquiries/:id  { handled: true }
  router.patch("/enquiries/:id", async (req, res) => {
    const parsed = enquiryPatch.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "Invalid update" });
    const ref = db.collection("enquiries").doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: "Not found" });
    await ref.update(parsed.data);
    res.json({ ok: true });
  });

  // PATCH /api/admin/artworks/:id  { price, status, ... }
  router.patch("/artworks/:id", async (req, res) => {
    const parsed = artworkPatch.safeParse(req.body ?? {});
    if (!parsed.success) {
      const fields = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        (fields[key] ??= []).push(issue.message);
      }
      return res.status(400).json({ error: "Invalid update", fields });
    }
    const ref = db.collection("artworks").doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: "Not found" });

    await ref.update({
      ...parsed.data,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: req.user.email ?? req.user.uid,
    });
    store.invalidate(); // so the public site shows the change straight away
    res.json({ ok: true });
  });

  return router;
}
