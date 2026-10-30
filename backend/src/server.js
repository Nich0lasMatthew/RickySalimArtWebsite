import { createApp } from "./app.js";
import { getDb, verifyIdToken } from "./firebase.js";
import { createCloudinaryStore } from "./images/cloudinary.js";

const port = Number(process.env.PORT) || 8080;

const corsOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const app = createApp({
  db: getDb(),
  verifyToken: verifyIdToken,
  imageStore: createCloudinaryStore(), // null until CLOUDINARY_URL is set
  corsOrigins,
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
  console.log(`Allowed origins: ${corsOrigins.join(", ")}`);
});
