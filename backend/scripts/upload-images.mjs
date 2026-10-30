#!/usr/bin/env node
// One-off move of the images in frontend/public/artworks to Cloudinary.
// From the backend folder, with CLOUDINARY_URL in .env:
//
//   pnpm upload-images --dry    list what would be uploaded
//   pnpm upload-images          upload, then point Firestore and the site at the new URLs
//
// Safe to re-run: images already on Cloudinary are kept, not duplicated.
// Afterwards frontend/public/artworks is no longer used and can be removed.

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCloudinaryStore, detectImageType } from "../src/images/cloudinary.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const imagesDir = path.join(root, "frontend/public/artworks");
const catalogPath = path.join(root, "frontend/src/data/catalog_cleaned.json");
const siteImagesPath = path.join(root, "frontend/src/data/site_images.json");
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const dryRun = process.argv.includes("--dry");

const FOLDERS = { "Original Paintings": "originalpaintings", "Carrot Cards": "carrotcards" };
const byPath = new Map(
  catalog.filter((a) => a.image_filename).map((a) => [`${FOLDERS[a.collection]}/${a.image_filename}`, a.id])
);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

let files;
try {
  files = walk(imagesDir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .map((full) => {
      const rel = path.relative(imagesDir, full).split(path.sep).join("/");
      return { full, rel, publicId: `artworks/${rel.replace(/\.[^.]+$/, "")}`, artworkId: byPath.get(rel) };
    });
} catch {
  console.error(`No images found in ${imagesDir}. Nothing to upload.`);
  process.exit(1);
}

const missing = [...byPath.keys()].filter((rel) => !files.some((f) => f.rel === rel));
if (missing.length) console.warn("Catalog images not on disk (skipped):\n - " + missing.join("\n - "));

const totalMb = files.reduce((n, f) => n + statSync(f.full).size, 0) / 1e6;
console.log(`${files.length} images, ${totalMb.toFixed(1)} MB`);
if (dryRun) {
  for (const f of files) console.log(` ${f.publicId}  ->  ${f.artworkId ?? "(site image)"}`);
  process.exit(0);
}

const images = createCloudinaryStore();
if (!images) {
  console.error("Add CLOUDINARY_URL to backend/.env first (Cloudinary dashboard > API Keys).");
  process.exit(1);
}

const urls = {};
for (const f of files) {
  const buf = readFileSync(f.full);
  const contentType = detectImageType(buf);
  if (!contentType) {
    console.warn(`\nSkipping ${f.rel}: not a JPEG/PNG/WebP`);
    continue;
  }
  const { url } = await images.upload(buf, { contentType, publicId: f.publicId });
  urls[f.rel] = url;
  process.stdout.write(".");
}
console.log(`\nUploaded ${Object.keys(urls).length} images to Cloudinary (${images.cloudName}).`);

// Artworks whose image lives on another site (Season 1 cards on Beacons):
// Cloudinary fetches them directly.
const remote = catalog.filter(
  (a) => !a.image_filename && typeof a.image_url === "string" && a.image_url.startsWith("https://cdn.beacons.ai/")
);
const remoteUrls = {};
for (const a of remote) {
  const folder = a.season ? `carrotcards/season-${a.season}` : "carrotcards";
  const { url } = await images.upload(a.image_url, { publicId: `artworks/${folder}/${a.id}` });
  remoteUrls[a.id] = url;
  process.stdout.write("+");
}
if (remote.length) console.log(`\nCopied ${remote.length} images from Beacons.`);

// Firestore: point each artwork at its hosted image.
const { getDb } = await import("../src/firebase.js");
const db = getDb();
const batch = db.batch();
let linked = 0;
for (const f of files) {
  if (!f.artworkId || !urls[f.rel]) continue;
  batch.set(db.collection("artworks").doc(f.artworkId), { image_url: urls[f.rel], image_path: f.publicId }, { merge: true });
  linked++;
}
for (const [id, url] of Object.entries(remoteUrls)) {
  batch.set(db.collection("artworks").doc(id), { image_url: url }, { merge: true });
  linked++;
}
await batch.commit();
console.log(`Linked ${linked} artworks in Firestore.`);

// The site's built-in backup catalog (used if the API is asleep or down).
for (const item of catalog) {
  const url = urls[`${FOLDERS[item.collection]}/${item.image_filename}`];
  if (url) item.image_url = url;
  if (remoteUrls[item.id]) item.image_url = remoteUrls[item.id];
}
writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + "\n");

// Images that aren't artworks (the portrait).
const siteImages = {};
for (const f of files) {
  if (!f.artworkId && urls[f.rel]) siteImages[path.basename(f.rel).replace(/\.[^.]+$/, "")] = urls[f.rel];
}
writeFileSync(siteImagesPath, JSON.stringify(siteImages, null, 2) + "\n");
console.log("Updated frontend/src/data/catalog_cleaned.json and site_images.json.");
console.log("\nAll done. Check the site, then remove frontend/public/artworks.");
