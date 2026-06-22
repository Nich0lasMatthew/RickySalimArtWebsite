// Maps a catalog "collection" value to its image folder under /public/artworks
const COLLECTION_FOLDERS = {
  "Original Paintings": "originalpaintings",
  "Carrot Cards": "carrotcards",
};

export function getImageSrc(item) {
  const folder = COLLECTION_FOLDERS[item.collection];
  return `/artworks/${folder}/${item.image_filename}`;
}

export function getAllCollections() {
  return Object.keys(COLLECTION_FOLDERS);
}
