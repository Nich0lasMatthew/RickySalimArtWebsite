// Maps a catalog "collection" value to its old image folder under /public/artworks
const COLLECTION_FOLDERS = {
  "Original Paintings": "originalpaintings",
  "Carrot Cards": "carrotcards",
};

/** Local path of the original file, e.g. "/artworks/carrotcards/x.jpg" (used by the seed script). */
export function getLocalImagePath(item) {
  const folder = COLLECTION_FOLDERS[item.collection];
  return `/artworks/${folder}/${item.image_filename}`;
}

const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/;

/**
 * A URL for an image at roughly `width` pixels wide. Cloudinary images are
 * resized and converted to the best format for the browser (WebP/AVIF) on the fly,
 * so a gallery thumbnail downloads ~100 KB instead of the 1-2 MB original.
 */
export function sizedImage(url, width) {
  const m = typeof url === "string" && url.match(CLOUDINARY_UPLOAD);
  if (!m || !width) return url;
  return `${m[1]}f_auto,q_auto,c_limit,w_${Math.round(width)}/${m[2]}`;
}

/** What <img src> should use for an artwork. */
export function getImageSrc(item, width) {
  return sizedImage(item.image_url || getLocalImagePath(item), width);
}

export function getAllCollections() {
  return Object.keys(COLLECTION_FOLDERS);
}
