import cors from "cors";
import express from "express";
import helmet from "helmet";
import { authenticate } from "./middleware/auth.js";
import { adminRouter } from "./routes/admin.js";
import { artworksRouter } from "./routes/artworks.js";
import { enquiriesRouter } from "./routes/enquiries.js";
import { meRouter } from "./routes/me.js";
import { createArtworkStore } from "./store/artworks.js";

/**
 * Builds the Express app. `db` is a Firestore instance and `verifyToken`
 * checks Firebase ID tokens (both are fakes in tests), which keeps the app easy
 * to test and independent of where it is hosted.
 */
export function createApp({
  db,
  verifyToken,
  imageStore = null,
  corsOrigins = [],
  enquiryLimitPerHour = 5,
  cacheTtlMs,
} = {}) {
  const app = express();

  app.set("trust proxy", 1); // correct client IPs behind a host's proxy (rate limiting)
  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      // No Origin header = same-origin request, curl, health checks: allowed.
      origin: (origin, callback) =>
        callback(null, !origin || corsOrigins.includes(origin)),
    })
  );
  app.use(express.json({ limit: "10kb" }));
  app.use("/api", authenticate(verifyToken));

  const store = createArtworkStore(db, { ttlMs: cacheTtlMs });

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/artworks", artworksRouter(store));
  app.use("/api/me", meRouter({ db }));
  app.use("/api/admin", adminRouter({ db, store, imageStore }));
  app.use(
    "/api/enquiries",
    enquiriesRouter({ db, limitPerHour: enquiryLimitPerHour })
  );

  app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === "entity.parse.failed") {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
    if (err.type === "entity.too.large") {
      return res.status(413).json({ error: "That's too large. Images must be under 10 MB." });
    }
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  });

  return app;
}
