#!/usr/bin/env node
// Seeds / syncs the Firestore `artworks` collection from the frontend's
// src/data/catalog_cleaned.json. Run from the backend folder:
//
//   pnpm seed --dry     Preview only (no Firebase needed)
//   pnpm seed           Write to Firestore (uses GOOGLE_APPLICATION_CREDENTIALS from .env)
//
// Optional: --key=/path/key.json  and  --site=https://your-domain
//
// Safe to re-run. For documents that already exist it never overwrites `price`,
// `status`, `image_url` or `image_path`, so admin edits and Storage URLs are kept.
// After the first seed, run `pnpm upload-images` to host the images in Storage.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getLocalImagePath } from "../../frontend/src/utils/artwork.js";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(backendRoot, "../frontend/src/data/catalog_cleaned.json");

const args = process.argv.slice(2);
const flag = (name) =>
  args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

const dryRun = args.includes("--dry");
const keyPath = flag("key") ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;
const siteUrl = (
  flag("site") ?? process.env.SITE_URL ?? "https://rickysalimart.web.app"
).replace(/\/$/, "");

// Keeps the existing snake_case field names so current pages work unchanged,
// and adds the fields the shop (and the iOS app) need.
function toDoc(item, index) {
  // eslint-disable-next-line no-unused-vars
  const { source_pdf, source_page, notes, image_url: _url, ...rest } = item;
  const imagePath = getLocalImagePath(item); // "/artworks/<folder>/<file>"
  const rawPrice = String(item.price ?? "").replace(/[^0-9.]/g, "");

  return {
    ...rest,
    price: rawPrice ? Number(rawPrice) : null, // AUD, or null until priced
    status: item.available === "Yes" ? "available" : "sold", // available | reserved | sold
    image_path: imagePath,
    image_url: item.image_url || siteUrl + encodeURI(imagePath),
    sort_order: index,
  };
}

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const docs = catalog.map(toDoc);

// ---- validation -----------------------------------------------------------
const problems = [];
const seen = new Set();
for (const d of docs) {
  if (!d.id) problems.push(`Missing id: ${d.title}`);
  if (seen.has(d.id)) problems.push(`Duplicate id: ${d.id}`);
  seen.add(d.id);
  if (!d.title) problems.push(`Missing title: ${d.id}`);
  if (d.image_path.includes("undefined"))
    problems.push(`Unknown collection "${d.collection}" or no image for: ${d.id}`);
}
if (problems.length) {
  console.error("Catalog problems:\n - " + problems.join("\n - "));
  process.exit(1);
}

const byCollection = docs.reduce((acc, d) => {
  acc[d.collection] = (acc[d.collection] ?? 0) + 1;
  return acc;
}, {});
console.log(`Catalog OK: ${docs.length} artworks`, byCollection);

if (dryRun) {
  console.log("\nDry run - nothing written. Example document:\n");
  console.log(JSON.stringify(docs[0], null, 2));
  process.exit(0);
}

// ---- write to Firestore ---------------------------------------------------
if (!keyPath) {
  console.error(
    "\nNo service account key. Set GOOGLE_APPLICATION_CREDENTIALS in .env " +
      "or pass --key=/path/to/key.json."
  );
  process.exit(1);
}

const { initializeApp, cert } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");

initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, "utf8"))) });
const db = getFirestore();
const col = db.collection("artworks");

const existing = new Set((await col.select().get()).docs.map((d) => d.id));
const batch = db.batch(); // 500-write limit; this catalog is far below it
let created = 0;
let updated = 0;

for (const { id, ...data } of docs) {
  if (existing.has(id)) {
    // eslint-disable-next-line no-unused-vars
    // Don't clobber price/status edited in the admin page, or the Storage
    // image URLs written by upload-images.
    const { price, status, image_url, image_path, ...keep } = data;
    batch.set(col.doc(id), keep, { merge: true });
    updated++;
  } else {
    batch.set(col.doc(id), data);
    created++;
  }
}

await batch.commit();
console.log(`Done. Created ${created}, updated ${updated} in "artworks".`);
