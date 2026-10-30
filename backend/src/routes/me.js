import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { requireUser } from "../middleware/auth.js";

/**
 * GET /api/me - the signed-in user's profile and role.
 * Also keeps a `users/{uid}` document, which orders and payments will hang off later.
 */
export function meRouter({ db }) {
  const router = Router();

  router.get("/", requireUser, async (req, res) => {
    const { uid, email, name, role, emailVerified } = req.user;
    const ref = db.collection("users").doc(uid);
    const snap = await ref.get();
    await ref.set(
      {
        email,
        name,
        role, // mirrored for display only; the token claim is what grants access
        lastSeenAt: FieldValue.serverTimestamp(),
        ...(snap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      },
      { merge: true }
    );
    res.set("Cache-Control", "no-store");
    res.json({ user: { uid, email, name, role, emailVerified } });
  });

  return router;
}
