import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { fetchArtworksFresh, fetchEnquiries, setEnquiryHandled, updateArtwork } from "../api/client";
import { clearArtworksCache } from "../hooks/useArtworks";
import AdminArtworkForm from "./AdminArtworkForm";
import { getImageSrc } from "../utils/artwork";
import "./Account.css";
import "./Admin.css";

const STATUSES = ["available", "reserved", "sold"];

export default function Admin() {
  const [tab, setTab] = useState("artworks");
  return (
    <div className="acct-page">
      <Navbar />
      <section className="admin-wrap">
        <p className="acct-kicker">Administration</p>
        <h1>Admin</h1>
        <div className="admin-tabs" role="tablist">
          {["artworks", "enquiries"].map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={`filter-pill ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t === "artworks" ? "Artworks" : "Enquiries"}
            </button>
          ))}
        </div>
        {tab === "artworks" ? <ArtworksAdmin /> : <EnquiriesAdmin />}
      </section>
    </div>
  );
}

function useLoad(loader) {
  const [state, setState] = useState({ data: null, error: "" });
  useEffect(() => {
    const controller = new AbortController();
    loader({ signal: controller.signal })
      .then((data) => setState({ data, error: "" }))
      .catch((err) => {
        if (err.name !== "AbortError") setState({ data: null, error: err.message });
      });
    return () => controller.abort();
  }, [loader]);
  return [state, setState];
}

/* ---------------- Artworks: price + status ---------------- */

function ArtworksAdmin() {
  const [{ data: artworks, error }, setState] = useLoad(fetchArtworksFresh);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | artwork
  const [notice, setNotice] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (artworks ?? []).filter(
      (a) =>
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.collection.toLowerCase().includes(q) ||
        (a.season && `season ${a.season}`.includes(q))
    );
  }, [artworks, query]);

  const onSaved = (id, changes) => {
    clearArtworksCache();
    setState((s) => ({
      ...s,
      data: s.data.map((a) => (a.id === id ? { ...a, ...changes } : a)),
    }));
  };

  function onFormDone(artwork, what) {
    clearArtworksCache();
    setState((s) => {
      const list = s.data ?? [];
      if (what === "created") return { ...s, data: [...list, artwork] };
      if (what === "deleted") return { ...s, data: list.filter((a) => a.id !== artwork.id) };
      return { ...s, data: list.map((a) => (a.id === artwork.id ? artwork : a)) };
    });
    setEditing(null);
    setNotice(`“${artwork.title}” was ${what}.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (error) return <p className="acct-error">Couldn't load artworks: {error}</p>;
  if (!artworks) return <p className="acct-muted">Loading…</p>;

  if (editing) {
    return (
      <AdminArtworkForm
        key={editing === "new" ? "new" : editing.id}
        artwork={editing === "new" ? null : editing}
        onDone={onFormDone}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <>
      <div className="admin-toolbar">
        <button type="button" className="btn btn-primary" onClick={() => { setNotice(""); setEditing("new"); }}>
          Add painting
        </button>
        <span className="acct-small acct-muted">{artworks.length} artworks</span>
      </div>
      {notice && <p className="acct-notice" role="status">{notice}</p>}
      <input
        className="admin-search"
        type="search"
        placeholder="Search by title or collection"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <p className="acct-small acct-muted">
        Prices are in AUD. Leave a price empty to show "Price on enquiry".
      </p>
      <div className="admin-list">
        {visible.map((a) => (
          <ArtworkRow key={a.id} artwork={a} onSaved={onSaved} onEdit={() => { setNotice(""); setEditing(a); }} />
        ))}
      </div>
    </>
  );
}

function ArtworkRow({ artwork, onSaved, onEdit }) {
  const [price, setPrice] = useState(artwork.price ?? "");
  const [status, setStatus] = useState(artwork.status ?? "available");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const dirty = String(price) !== String(artwork.price ?? "") || status !== (artwork.status ?? "available");

  async function save() {
    const priceValue = price === "" ? null : Number(price);
    if (priceValue !== null && (!Number.isFinite(priceValue) || priceValue < 0)) {
      return setMessage("Enter a number");
    }
    setSaving(true);
    setMessage("");
    try {
      const changes = { price: priceValue, status };
      await updateArtwork(artwork.id, changes);
      onSaved(artwork.id, changes);
      setMessage("Saved");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-row">
      <img src={getImageSrc(artwork, 160)} alt="" loading="lazy" className="admin-thumb" />
      <div className="admin-row-main">
        <Link to={`/artwork/${artwork.id}`} className="admin-title">{artwork.title}</Link>
        <p className="acct-small acct-muted">
          {artwork.collection}
          {artwork.season ? ` · Season ${artwork.season}` : ""}
        </p>
        <button type="button" className="acct-link acct-small" onClick={onEdit}>Edit details</button>
      </div>
      <label className="admin-inline">
        <span>A$</span>
        <input
          type="number"
          min="0"
          step="1"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          aria-label={`Price for ${artwork.title}`}
        />
      </label>
      <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={`Status for ${artwork.title}`}>
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
        ))}
      </select>
      <div className="admin-save">
        <button type="button" className="btn btn-primary admin-btn" onClick={save} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        {message && <span className="acct-small">{message}</span>}
      </div>
    </div>
  );
}

/* ---------------- Enquiries ---------------- */

function EnquiriesAdmin() {
  const [{ data: enquiries, error }, setState] = useLoad(fetchEnquiries);
  const [showHandled, setShowHandled] = useState(false);

  async function toggle(e) {
    const handled = !e.handled;
    setState((s) => ({ ...s, data: s.data.map((x) => (x.id === e.id ? { ...x, handled } : x)) }));
    try {
      await setEnquiryHandled(e.id, handled);
    } catch {
      setState((s) => ({ ...s, data: s.data.map((x) => (x.id === e.id ? { ...x, handled: !handled } : x)) }));
    }
  }

  if (error) return <p className="acct-error">Couldn't load enquiries: {error}</p>;
  if (!enquiries) return <p className="acct-muted">Loading…</p>;

  const open = enquiries.filter((e) => !e.handled);
  const list = showHandled ? enquiries : open;

  return (
    <>
      <label className="acct-small admin-check">
        <input type="checkbox" checked={showHandled} onChange={(e) => setShowHandled(e.target.checked)} />
        Show handled ({enquiries.length - open.length})
      </label>
      {list.length === 0 && <p className="acct-muted">No open enquiries.</p>}
      <div className="admin-list">
        {list.map((e) => (
          <article key={e.id} className={`admin-enquiry ${e.handled ? "is-handled" : ""}`}>
            <header>
              <strong>{e.name}</strong>{" "}
              <a href={`mailto:${e.email}?subject=${encodeURIComponent(`Re: ${e.artwork || "your enquiry"}`)}`}>
                {e.email}
              </a>
              <span className="acct-small acct-muted">
                {e.createdAt ? new Date(e.createdAt).toLocaleString() : ""}
                {e.uid ? " · has an account" : ""}
              </span>
            </header>
            {e.artwork && <p className="acct-small">About: <strong>{e.artwork}</strong></p>}
            <p className="admin-message">{e.message}</p>
            <button type="button" className="btn acct-btn-outline admin-btn" onClick={() => toggle(e)}>
              {e.handled ? "Mark as open" : "Mark as handled"}
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
