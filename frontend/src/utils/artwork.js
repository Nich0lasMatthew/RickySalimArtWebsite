// Maps a catalog "collection" value to its image folder under /public/artworks
const COLLECTION_FOLDERS = {
  "Original Paintings": "originalpaintings",
  "Carrot Cards": "carrotcards",
};

/** Local path of the original file, e.g. "/artworks/carrotcards/x.jpg". */
export function getLocalImagePath(item) {
  const folder = COLLECTION_FOLDERS[item.collection];
  return `/artworks/${folder}/${item.image_filename}`;
}

/**
 * What <img src> should use. Artworks loaded from the API carry `image_url`
 * (hosted in Firebase Storage); the bundled fallback catalog does not, so it
 * uses the local copy until the local images are removed.
 */
export function getImageSrc(item) {
  return item.image_url || getLocalImagePath(item);
}

export function getAllCollections() {
  return Object.keys(COLLECTION_FOLDERS);
}
