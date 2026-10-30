#!/usr/bin/env node
// Uploads every artwork image to Firebase Storage and saves its public URL
// in Firestore as `image_url`. Run AFTER `pnpm seed`. From the backend folder:
//
//   pnpm upload-images --dry    list what would be uploaded
//   pnpm upload-images          upload + update Firestore
//
// Needs FIREBASE_STORAGE_BUCKET in .env (Firebase console > Storage, e.g.
// "rickysalimart.firebasestorage.app"). Safe to re-run: files already in the
// bucket are skipped and keep their existing URL. It reads images from
// frontend/public/artworks, so keep that folder until this has run.
//
// URLs use Firebase download tokens, so they work even though storage.rules
// blocks all direct browser access to the bucket.

import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const imagesDir = path.join(root, "frontend/public/artworks");
const catalogPath = path.join(root, "frontend/src/data/catalog_cleaned.json");
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const dryRun = process.argv.includes("--dry");

const FOLDERS = { "Original Paintings": "originalpaintings", "Carrot Cards": "carrotcards" };
const TYPES = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

// Every image file, plus which artwork (if any) it belongs to.
const byPath = new Map(
  catalog.map((a) => [`${FOLDERS[a.collection]}/${a.image_filename}`, a.id])
);
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
const files = walk(imagesDir)
  .filter((f) => TYPES[path.extname(f).toLowerCase()])
  .map((full) => {
    const rel = path.relative(imagesDir, full).split(path.sep).join("/");
    return { full, rel, dest: `artworks/${rel}`, artworkId: byPath.get(rel) };
  });

const missing = [...byPath.keys()].filter((rel) => !files.some((f) => f.rel === rel));
if (missing.length) {
  console.error("Catalog images not found on disk:\n - " + missing.join("\n - "));
  process.exit(1);
}

const totalMb = files.reduce((n, f) => n + statSync(f.full).size, 0) / 1e6;
console.log(`${files.length} images, ${totalMb.toFixed(1)} MB`);
if (dryRun) {
  for (const f of files) console.log(` ${f.dest}  ->  ${f.artworkId ?? "(not an artwork, e.g. portrait)"}`);
  process.exit(0);
}

if (!process.env.FIREBASE_STORAGE_BUCKET) {
  console.error("Set FIREBASE_STORAGE_BUCKET in backend/.env first.");
  process.exit(1);
}

const { getBucket, getDb } = await import("../src/firebase.js");
const bucket = getBucket();
const db = getDb();

const publicUrl = (dest, token) =>
  `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`;

const urls = {};
let uploaded = 0;
for (const f of files) {
  const file = bucket.file(f.dest);
  const [exists] = await file.exists();
  let token;
  if (exists) {
    const [meta] = await file.getMetadata();
    token = meta.metadata?.firebaseStorageDownloadTokens?.split(",")[0];
  }
  if (!token) {
    token = randomUUID();
    await bucket.upload(f.full, {
      destination: f.dest,
      metadata: {
        contentType: TYPES[path.extname(f.full).toLowerCase()],
        cacheControl: "public, max-age=31536000, immutable",
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });
    uploaded++;
    process.stdout.write(".");
  }
  urls[f.rel] = publicUrl(f.dest, token);
}
console.log(`\nUploaded ${uploaded}, already there ${files.length - uploaded}.`);

// Point each artwork at its hosted image.
const batch = db.batch();
let linked = 0;
for (const f of files) {
  if (!f.artworkId) continue;
  batch.set(
    db.collection("artworks").doc(f.artworkId),
    { image_url: urls[f.rel], image_path: f.dest },
    { merge: true }
  );
  linked++;
}
await batch.commit();
console.log(`Linked ${linked} artworks to their Storage URLs.`);

// The site bundles this catalog as a backup for when the API is unreachable,
// so give it the hosted URLs too. After this, frontend/public/artworks can go.
for (const item of catalog) {
  const url = urls[`${FOLDERS[item.collection]}/${item.image_filename}`];
  if (url) item.image_url = url;
}
writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + "\n");
console.log("Wrote image_url into frontend/src/data/catalog_cleaned.json.");

const other = files.filter((f) => !f.artworkId);
if (other.length) {
  console.log("\nOther images (use these URLs in the code if you need them):");
  for (const f of other) console.log(` ${f.rel}: ${urls[f.rel]}`);
}
