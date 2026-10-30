import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useArtworks } from "../hooks/useArtworks";
import { getImageSrc, getAllCollections } from "../utils/artwork";
import Navbar from "../components/Navbar";
import "./Gallery.css";

const FILTERS = ["All", ...getAllCollections()];

export default function Gallery() {
  const { artworks: data } = useArtworks();
  const [activeFilter, setActiveFilter] = useState("All");
  const [edges, setEdges] = useState({ start: true, end: false, progress: 0 });
  const trackRef = useRef(null);
  const wheelLock = useRef(false);

  const items = useMemo(() => {
    const filtered =
      activeFilter === "All" ? data : data.filter((item) => item.collection === activeFilter);
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  }, [data, activeFilter]);

  // Keep the arrows and progress bar in sync with wherever the row has scrolled to.
  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({
      start: el.scrollLeft <= 2,
      end: el.scrollLeft >= max - 2,
      progress: max > 0 ? el.scrollLeft / max : 1,
    });
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: 0, behavior: "auto" });
    updateEdges();
    const onResize = () => updateEdges();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [items, updateEdges]);

  const cardStep = () => {
    const el = trackRef.current;
    const card = el?.querySelector(".gallery-card");
    if (!card) return 0;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    return card.getBoundingClientRect().width + gap;
  };

  // Arrows move one screenful.
  const page = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const step = cardStep();
    const perPage = Math.max(1, Math.floor((el.clientWidth + 1) / step));
    el.scrollBy({ left: dir * step * perPage, behavior: "smooth" });
  };

  // A normal mouse wheel (up/down) moves the row one card at a time while there's
  // more to see; at either end the page scrolls as usual. Sideways trackpad
  // swipes and touch swipes are handled natively by the browser.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    function onWheel(e) {
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      const dir = Math.sign(e.deltaY);
      const max = el.scrollWidth - el.clientWidth;
      const canMove = dir > 0 ? el.scrollLeft < max - 2 : el.scrollLeft > 2;
      if (!canMove) return;
      e.preventDefault();
      if (wheelLock.current) return;
      wheelLock.current = true;
      el.scrollBy({ left: dir * cardStep(), behavior: "smooth" });
      window.setTimeout(() => (wheelLock.current = false), 420);
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onKeyDown = (e) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      page(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      page(-1);
    }
  };

  const scrollable = !(edges.start && edges.end);

  return (
    <div className="gallery-page">
      <Navbar />

      <section className="gallery-header">
        <p className="gallery-kicker">The Collection</p>
        <h1>Gallery</h1>
        <p className="gallery-intro">
          Original paintings and Carrot Card works by Ricky Salim — each piece
          paired with the prophetic word it carries.
        </p>

        <div className="gallery-filters">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              className={`filter-pill ${activeFilter === filter ? "active" : ""}`}
              onClick={() => setActiveFilter(filter)}
              aria-pressed={activeFilter === filter}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      <section className="gallery-carousel-section" aria-label="Artworks">
        {scrollable && (
          <button
            className="gallery-arrow gallery-arrow-left"
            onClick={() => page(-1)}
            disabled={edges.start}
            aria-label="Previous artworks"
          >
            ‹
          </button>
        )}

        <div
          className="gallery-track"
          ref={trackRef}
          onScroll={updateEdges}
          onKeyDown={onKeyDown}
          tabIndex={0}
          role="region"
          aria-label="Artworks, scroll sideways for more"
        >
          {items.map((item) => (
            <Link to={`/artwork/${item.id}`} className="gallery-card" key={item.id}>
              <div className="gallery-image-wrap">
                <img
                  src={getImageSrc(item)}
                  alt={item.title}
                  loading="lazy"
                  decoding="async"
                  draggable="false"
                  className="gallery-image"
                />
              </div>

              <div className="gallery-card-body">
                <h3>{item.title}</h3>
                <p>{item.collection}</p>
              </div>
            </Link>
          ))}
        </div>

        {scrollable && (
          <button
            className="gallery-arrow gallery-arrow-right"
            onClick={() => page(1)}
            disabled={edges.end}
            aria-label="Next artworks"
          >
            ›
          </button>
        )}

        {scrollable && (
          <div className="gallery-progress" aria-hidden="true">
            <span style={{ transform: `scaleX(${Math.max(0.04, edges.progress)})` }} />
          </div>
        )}
      </section>

      {items.length === 0 && (
        <p className="gallery-empty">No works found in this collection.</p>
      )}
    </div>
  );
}
