// Images that aren't artworks. After running `pnpm upload-images`, paste the
// printed portrait URL into frontend/.env.local as VITE_PORTRAIT_URL.
export const PORTRAIT_URL =
  import.meta.env.VITE_PORTRAIT_URL || "/artworks/ricky-portrait.jpg";
