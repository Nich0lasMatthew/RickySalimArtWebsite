import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

const enquirySchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100),
  email: z.string().trim().email("Please enter a valid email").max(200),
  message: z.string().trim().min(1, "Please write a message").max(2000),
  artwork: z.string().trim().max(200).optional(),
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
      const fields = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        (fields[key] ??= []).push(issue.message);
      }
      return res.status(400).json({ error: "Invalid enquiry", fields });
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
