import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, createArtwork, deleteArtwork, updateArtwork, uploadImage } from "../api/client";
import { getAllCollections, getImageSrc, sizedImage } from "../utils/artwork";
import { codeErrors } from "../utils/validate";

const STATUSES = ["available", "reserved", "sold"];
const TEXT_FIELDS = ["title", "size", "medium", "year", "scripture_reference", "description", "prophetic_word"];
const MAX_EDGE = 2400; // px; plenty for a full-screen view, keeps uploads small

const EMPTY = {
  title: "",
  collection: "Original Paintings",
  season: "",
  year: "",
  size: "",
  medium: "",
  price: "",
  status: "available",
  scripture_reference: "",
  description: "",
  prophetic_word: "",
  image_url: "",
};

function toForm(a) {
  if (!a) return EMPTY;
  return {
    ...EMPTY,
    ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, a[k] ?? EMPTY[k]])),
    price: a.price ?? "",
    season: a.season ?? "",
    image_url: a.image_url || "",
  };
}

/**
 * Re-encodes the chosen photo as a JPEG no larger than MAX_EDGE. This makes
 * uploads fast and strips hidden metadata such as the GPS location of the
 * phone that took the photo.
 */
async function prepareImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    throw new Error("Please choose a JPEG, PNG or WebP image.");
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read that image."))), "image/jpeg", 0.9)
  );
}

/** Add a new artwork (artwork = null) or edit an existing one. */
export default function AdminArtworkForm({ artwork, onDone, onCancel }) {
  const editing = Boolean(artwork);
  const initial = useMemo(() => toForm(artwork), [artwork]);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(""); // "" | "uploading" | "saving" | "deleting"
  const [preview, setPreview] = useState(artwork ? getImageSrc(artwork, 800) : "");
  const fileInput = useRef(null);
  const heading = useRef(null);

  useEffect(() => heading.current?.focus(), []);
  useEffect(() => () => preview.startsWith("blob:") && URL.revokeObjectURL(preview), [preview]);

  const set = (name) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
  };

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrors((er) => ({ ...er, image_url: undefined }));
    setMessage("");
    setBusy("uploading");
    try {
      const blob = await prepareImage(file);
      setPreview(URL.createObjectURL(blob));
      const { url } = await uploadImage(blob, form.title || file.name.replace(/\.[^.]+$/, ""));
      setForm((f) => ({ ...f, image_url: url }));
    } catch (err) {
      setPreview(artwork ? getImageSrc(artwork, 800) : "");
      setErrors((er) => ({ ...er, image_url: [err.message] }));
      if (fileInput.current) fileInput.current.value = "";
    } finally {
      setBusy("");
    }
  }

  function payload() {
    const price = String(form.price).trim();
    const out = {
      title: form.title,
      collection: form.collection,
      year: form.year.trim(),
      size: form.size,
      medium: form.medium,
      price: price === "" ? null : Number(price),
      status: form.status,
      scripture_reference: form.scripture_reference,
      description: form.description,
      prophetic_word: form.prophetic_word,
      image_url: form.image_url,
      season: form.collection === "Carrot Cards" && form.season !== "" ? Number(form.season) : null,
    };
    if (!editing) return out;
    // Only send what changed.
    const before = {
      ...Object.fromEntries(Object.keys(out).map((k) => [k, artwork[k] ?? ""])),
      price: artwork.price ?? null,
      season: artwork.season ?? null,
      status: artwork.status ?? "available",
    };
    return Object.fromEntries(Object.entries(out).filter(([k, v]) => v !== before[k]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    const local = { ...codeErrors(form, TEXT_FIELDS) };
    if (!form.title.trim()) local.title = ["Please enter a title"];
    if (!form.image_url) local.image_url = ["Please add an image"];
    if (form.price !== "" && !(Number(form.price) >= 0)) local.price = ["Enter a price like 1200, or leave it empty"];
    if (form.year && !/^\d{4}$/.test(form.year.trim())) local.year = ["Use a 4-digit year, e.g. 2025"];
    if (Object.keys(local).length) {
      setErrors(local);
      setMessage("Please check the highlighted fields.");
      return;
    }

    const body = payload();
    if (editing && Object.keys(body).length === 0) {
      setMessage("Nothing has changed.");
      return;
    }

    setBusy("saving");
    try {
      if (editing) {
        await updateArtwork(artwork.id, body);
        onDone({ ...artwork, ...body }, "updated");
      } else {
        const created = await createArtwork(body);
        onDone(created, "created");
      }
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      setMessage(err.status === 0 ? "Couldn't reach the server. Please try again." : err.message);
      setBusy("");
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${artwork.title}"? It will disappear from the site. This can't be undone.`)) return;
    setBusy("deleting");
    try {
      await deleteArtwork(artwork.id);
      onDone(artwork, "deleted");
    } catch (err) {
      setMessage(err.message);
      setBusy("");
    }
  }

  const err = (name) =>
    errors[name]?.[0] ? <em className="admin-field-error" id={`${name}-error`}>{errors[name][0]}</em> : null;
  const aria = (name) => (errors[name] ? { "aria-invalid": true, "aria-describedby": `${name}-error` } : {});

  return (
    <form className="admin-form" onSubmit={handleSubmit} noValidate>
      <div className="admin-form-head">
        <h2 tabIndex={-1} ref={heading}>{editing ? `Edit “${artwork.title}”` : "Add a painting"}</h2>
        <button type="button" className="btn btn-secondary admin-btn" onClick={onCancel} disabled={Boolean(busy)}>
          Cancel
        </button>
      </div>

      <div className="admin-form-grid">
        {/* Image */}
        <div className="admin-image-field">
          <div className={`admin-image-drop${preview ? " has-image" : ""}`}>
            {preview ? (
              <img src={preview.startsWith("blob:") ? preview : sizedImage(preview, 800)} alt="" />
            ) : (
              <span>No image yet</span>
            )}
            {busy === "uploading" && <span className="admin-image-busy">Uploading…</span>}
          </div>
          <label className="btn btn-secondary admin-file-button">
            {preview ? "Replace image" : "Choose image"}
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFile}
              disabled={Boolean(busy)}
            />
          </label>
          <p className="acct-small acct-muted">JPEG, PNG or WebP. Large photos are resized automatically.</p>
          {err("image_url")}
        </div>

        {/* Details */}
        <div className="admin-fields">
          <label className="acct-field admin-span-2">
            <span>Title *</span>
            <input value={form.title} onChange={set("title")} maxLength={120} required {...aria("title")} />
            {err("title")}
          </label>

          <label className="acct-field">
            <span>Collection *</span>
            <select value={form.collection} onChange={set("collection")}>
              {getAllCollections().map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>

          {form.collection === "Carrot Cards" ? (
            <label className="acct-field">
              <span>Season</span>
              <select value={form.season} onChange={set("season")} {...aria("season")}>
                <option value="">None</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Season {n}</option>)}
              </select>
              {err("season")}
            </label>
          ) : (
            <label className="acct-field">
              <span>Year</span>
              <input value={form.year} onChange={set("year")} inputMode="numeric" maxLength={4} placeholder="2026" {...aria("year")} />
              {err("year")}
            </label>
          )}

          <label className="acct-field">
            <span>Price (AUD)</span>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              value={form.price}
              onChange={set("price")}
              placeholder="Leave empty for “Price on enquiry”"
              {...aria("price")}
            />
            {err("price")}
          </label>

          <label className="acct-field">
            <span>Status</span>
            <select value={form.status} onChange={set("status")}>
              {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
            </select>
          </label>

          <label className="acct-field">
            <span>Size</span>
            <input value={form.size} onChange={set("size")} maxLength={60} placeholder="80cm x 100cm" {...aria("size")} />
            {err("size")}
          </label>

          <label className="acct-field">
            <span>Medium</span>
            <input value={form.medium} onChange={set("medium")} maxLength={100} placeholder="Acrylic on canvas" {...aria("medium")} />
            {err("medium")}
          </label>

          <label className="acct-field admin-span-2">
            <span>Scripture reference</span>
            <input value={form.scripture_reference} onChange={set("scripture_reference")} maxLength={120} placeholder="John 10:11" {...aria("scripture_reference")} />
            {err("scripture_reference")}
          </label>

          <label className="acct-field admin-span-2">
            <span>Description</span>
            <textarea rows={4} value={form.description} onChange={set("description")} maxLength={5000} {...aria("description")} />
            {err("description")}
          </label>

          <label className="acct-field admin-span-2">
            <span>Prophetic word</span>
            <textarea rows={5} value={form.prophetic_word} onChange={set("prophetic_word")} maxLength={5000} {...aria("prophetic_word")} />
            {err("prophetic_word")}
          </label>
        </div>
      </div>

      {message && <p className="acct-error admin-form-message" role="alert">{message}</p>}

      <div className="admin-form-actions">
        <button type="submit" className="btn btn-primary" disabled={Boolean(busy)}>
          {busy === "saving" ? "Saving…" : editing ? "Save changes" : "Add painting"}
        </button>
        {editing && (
          <button type="button" className="btn admin-btn-danger" onClick={handleDelete} disabled={Boolean(busy)}>
            {busy === "deleting" ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>
    </form>
  );
}
