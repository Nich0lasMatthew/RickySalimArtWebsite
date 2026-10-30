// All data access goes through the backend API. In dev, Vite proxies /api to
// the local server; in production set VITE_API_URL to the deployed API origin
// (leave it empty if the API is served from the same domain).
import { getIdToken } from "../lib/auth";

const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields; // per-field validation messages, when the API sends them
  }
}

// Signed-in users send their Firebase ID token so the API knows who they are.
async function request(path, { method = "GET", body, signal, fresh = false } = {}) {
  const token = await getIdToken();
  const headers = {
    ...(body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
    cache: fresh ? "no-store" : "default",
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // No JSON back means we didn't reach our API at all (not deployed, asleep,
    // or offline). Status 0 lets pages show a "can't reach the server" message.
    throw new ApiError(
      data?.error ?? `Request failed (${res.status})`,
      data ? res.status : 0,
      data?.fields
    );
  }
  return data;
}

/** params: { collection?, status? } */
export async function fetchArtworks(params = {}, options) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value)
  ).toString();
  const data = await request(`/artworks${qs ? `?${qs}` : ""}`, options);
  return data.artworks;
}

export async function fetchArtwork(id, options) {
  const data = await request(`/artworks/${encodeURIComponent(id)}`, options);
  return data.artwork;
}

/** payload: { name, email, message, artwork?, website? }  (website is the hidden honeypot) */
export function submitEnquiry(payload) {
  return request("/enquiries", { method: "POST", body: payload });
}

// ---- accounts --------------------------------------------------------------

/** The signed-in user's profile: { uid, email, name, role, emailVerified } */
export async function fetchMe(options) {
  const data = await request("/me", { ...options, fresh: true });
  return data.user;
}

// ---- admin (the API rejects these unless the token has the admin role) -----

export async function fetchArtworksFresh(options) {
  const data = await request("/artworks", { ...options, fresh: true });
  return data.artworks;
}

export function updateArtwork(id, changes) {
  return request(`/admin/artworks/${encodeURIComponent(id)}`, { method: "PATCH", body: changes });
}

export async function fetchEnquiries(options) {
  const data = await request("/admin/enquiries", { ...options, fresh: true });
  return data.enquiries;
}

export function setEnquiryHandled(id, handled) {
  return request(`/admin/enquiries/${encodeURIComponent(id)}`, { method: "PATCH", body: { handled } });
}

export async function createArtwork(fields) {
  const data = await request("/admin/artworks", { method: "POST", body: fields });
  return data.artwork;
}

export function deleteArtwork(id) {
  return request(`/admin/artworks/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Sends an image file (Blob) to the API, which stores it on Cloudinary. Returns { url, width, height }. */
export async function uploadImage(blob, name) {
  const token = await getIdToken();
  const res = await fetch(`${BASE}/api/admin/images?name=${encodeURIComponent(name || "artwork")}`, {
    method: "POST",
    headers: { "Content-Type": blob.type || "application/octet-stream", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: blob,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error ?? `Upload failed (${res.status})`, data ? res.status : 0);
  return data;
}
