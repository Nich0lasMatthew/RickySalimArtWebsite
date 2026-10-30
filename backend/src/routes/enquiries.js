import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { email, fieldErrors, safeText } from "../validation.js";

// Every field must be text of the right shape: objects ({"$gt": ""}), arrays,
// numbers, HTML/script and invisible characters are all rejected or stripped.
const enquirySchema = z.object({
  name: safeText({ max: 100, min: 1, required: "Please enter your name" }),
  email,
  message: safeText({ max: 2000, min: 1, multiline: true, required: "Please write a message" }),
  artwork: safeText({ max: 200 }).optional(),
});

export function enquiriesRouter({ db, limitPerHour = 5 }) {
  const router = Router();

  const limiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: limitPerHour,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many enquiries, please try again later." },
  });

  // POST /api/enquiries
  router.post("/", limiter, async (req, res) => {
    const body = req.body ?? {};

    // Honeypot: the form has a hidden "website" field humans never fill in.
    // Pretend success so bots don't learn anything.
    if (typeof body.website === "string" && body.website.trim() !== "") {
      return res.status(201).json({ ok: true });
    }

    const parsed = enquirySchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid enquiry", fields: fieldErrors(parsed.error) });
    }

    const { artwork, ...rest } = parsed.data;
    await db.collection("enquiries").add({
      ...rest,
      ...(artwork ? { artwork } : {}),
      ...(req.user ? { uid: req.user.uid } : {}),
      handled: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    res.status(201).json({ ok: true });
  });

  return router;
}
