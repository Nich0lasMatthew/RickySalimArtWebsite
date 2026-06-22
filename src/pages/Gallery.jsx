import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import data from "../data/catalog_cleaned.json";
import { getImageSrc, getAllCollections } from "../utils/artwork";
import Navbar from "../components/Navbar";
import "./Gallery.css";

const FILTERS = ["All", ...getAllCollections()];

export default function Gallery() {
  const [activeFilter, setActiveFilter] = useState("All");

  const items = useMemo(() => {
    const filtered =
      activeFilter === "All"
        ? data
        : data.filter((item) => item.collection === activeFilter);
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  }, [activeFilter]);

  return (
    <div className="gallery-page">
      <Navbar />

      <section className="gallery-header">
        <p className="gallery-kicker">The Collection</p>
        <h1>Gallery</h1>
        <p className="gallery-intro">
          Original paintings and Carrot Card works by Ricky Salim — each
          piece paired with the prophetic word it carries.
        </p>

        <div className="gallery-filters">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              className={`filter-pill ${
                activeFilter === filter ? "active" : ""
              }`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      <section className="gallery-grid">
        {items.map((item) => (
          <Link
            to={`/artwork/${item.id}`}
            className="gallery-card"
            key={item.id}
          >
            <div className="gallery-image-wrap">
              <img
                src={getImageSrc(item)}
                alt={item.title}
                loading="lazy"
                className="gallery-image"
              />
            </div>
            <div className="gallery-card-body">
              <h3>{item.title}</h3>
              <p>{item.collection}</p>
            </div>
          </Link>
        ))}
      </section>

      {items.length === 0 && (
        <p className="gallery-empty">No works found in this collection.</p>
      )}
    </div>
  );
}
