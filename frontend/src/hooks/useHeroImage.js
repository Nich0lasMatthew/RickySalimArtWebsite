import { useArtworks } from "./useArtworks";
import { getImageSrc } from "../utils/artwork";

const HERO_ARTWORK_ID = "words";

/** Inline style that sets the hero background to an artwork's hosted image. */
export function useHeroStyle() {
  const { artworks } = useArtworks();
  const art = artworks.find((a) => a.id === HERO_ARTWORK_ID);
  return art ? { "--hero-image": `url("${getImageSrc(art)}")` } : undefined;
}
