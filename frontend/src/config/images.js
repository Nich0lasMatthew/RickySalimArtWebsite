import siteImages from "../data/site_images.json";

// Images that aren't artworks. `pnpm upload-images` fills site_images.json
// with their hosted URLs.
export const PORTRAIT_URL = siteImages["ricky-portrait"] || "/artworks/ricky-portrait.jpg";
