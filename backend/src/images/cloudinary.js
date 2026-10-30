import { createHash } from "node:crypto";

/**
 * Image hosting on Cloudinary (free plan, no card). Talks to Cloudinary's
 * upload API directly, so no extra package is needed.
 *
 * Configure with CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
 * (Cloudinary dashboard > API Keys shows it ready to copy).
 */
export function createCloudinaryStore(cloudinaryUrl = process.env.CLOUDINARY_URL) {
  if (!cloudinaryUrl) return null;

  let apiKey, apiSecret, cloudName;
  try {
    const u = new URL(cloudinaryUrl);
    if (u.protocol !== "cloudinary:") throw new Error();
    apiKey = decodeURIComponent(u.username);
    apiSecret = decodeURIComponent(u.password);
    cloudName = u.hostname;
  } catch {
    throw new Error("CLOUDINARY_URL should look like cloudinary://KEY:SECRET@CLOUD_NAME");
  }
  if (!apiKey || !apiSecret || !cloudName) {
    throw new Error("CLOUDINARY_URL is missing the key, secret or cloud name");
  }

  const prefix = `https://res.cloudinary.com/${cloudName}/image/upload/`;

  return {
    cloudName,

    /** True for images hosted in *this* Cloudinary account. */
    owns: (url) => typeof url === "string" && url.startsWith(prefix),

    /**
     * Uploads image bytes. publicId like "artworks/originalpaintings/arms".
     * Returns { url, width, height }.
     */
    async upload(source, { contentType, publicId, overwrite = false }) {
      const params = {
        overwrite: String(overwrite),
        public_id: publicId,
        timestamp: String(Math.floor(Date.now() / 1000)),
      };
      const toSign = Object.keys(params)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join("&");
      const signature = createHash("sha1").update(toSign + apiSecret).digest("hex");

      const form = new FormData();
      for (const [k, v] of Object.entries(params)) form.append(k, v);
      form.append("api_key", apiKey);
      form.append("signature", signature);
      // `source` is image bytes, or an https URL for Cloudinary to fetch itself.
      if (typeof source === "string") form.append("file", source);
      else form.append("file", new Blob([source], { type: contentType }), "upload");

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(`Cloudinary upload failed: ${data?.error?.message ?? res.status}`);
      }
      return { url: data.secure_url, width: data.width, height: data.height };
    },
  };
}

/** Recognises JPEG / PNG / WebP from the file's first bytes (not its name or claimed type). */
export function detectImageType(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}
