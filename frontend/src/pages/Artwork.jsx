import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useArtworks } from "../hooks/useArtworks";
import { getImageSrc } from "../utils/artwork";
import Navbar from "../components/Navbar";
import "./Artwork.css";

export default function Artwork() {
  const { id } = useParams();
  const { artworks, loading } = useArtworks();

  const artwork = useMemo(
    () => artworks.find((item) => item.id === id),
    [artworks, id]
  );

  const related = useMemo(() => {
    if (!artwork) return [];
    return artworks
      .filter(
        (item) => item.collection === artwork.collection && item.id !== id
      )
      .slice(0, 4);
  }, [artworks, artwork, id]);

  if (!artwork && loading) {
    return (
      <div className="artwork-page">
        <Navbar />
        <div className="artwork-not-found">
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="artwork-page">
        <Navbar />
        <div className="artwork-not-found">
          <h1>Artwork not found</h1>
          <p>This piece may have been moved or doesn't exist.</p>
          <Link to="/gallery" className="btn btn-primary">
            Back to Gallery
          </Link>
        </div>
      </div>
    );
  }

  const details = [
    artwork.medium && { label: "Medium", value: artwork.medium },
    artwork.size && { label: "Size", value: artwork.size },
    artwork.year && { label: "Year", value: artwork.year },
    artwork.collection && { label: "Collection", value: artwork.collection },
    artwork.season && { label: "Season", value: `Season ${artwork.season}` },
    {
      label: "Price",
      value:
        artwork.status === "sold"
          ? "Sold"
          : typeof artwork.price === "number"
          ? `A$${artwork.price.toLocaleString("en-AU")}${artwork.status === "reserved" ? " (reserved)" : ""}`
          : artwork.status === "reserved"
          ? "Reserved"
          : "Price on enquiry",
    },
  ].filter(Boolean);

  return (
    <div className="artwork-page">
      <Navbar />

      <div className="artwork-breadcrumb">
        <Link to="/gallery">&larr; Back to Gallery</Link>
      </div>

      <section className="artwork-main">
        <div className="artwork-image-col">
          <img
            src={getImageSrc(artwork, 1800)}
            alt={artwork.title}
            className="artwork-image"
          />
        </div>

        <div className="artwork-info-col">
          <p className="artwork-kicker">{artwork.collection}</p>
          <h1>{artwork.title}</h1>
          <p className="artwork-artist">{artwork.artist}</p>

          {details.length > 0 && (
            <dl className="artwork-details">
              {details.map((d) => (
                <div className="artwork-detail-row" key={d.label}>
                  <dt>{d.label}</dt>
                  <dd>{d.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {artwork.description && (
            <p className="artwork-description">{artwork.description}</p>
          )}

          {artwork.prophetic_word && (
            <div className="artwork-prophetic">
              <p className="artwork-section-label">Prophetic Word</p>
              <p className="artwork-prophetic-text">
                {artwork.prophetic_word}
              </p>
            </div>
          )}

          {artwork.scripture_reference && (
            <p className="artwork-scripture">{artwork.scripture_reference}</p>
          )}

          <div className="artwork-actions">
            <Link
              to={`/enquiry?artwork=${encodeURIComponent(artwork.title)}`}
              className="btn btn-primary"
            >
              Make an Enquiry
            </Link>
            <Link to="/gallery" className="btn btn-secondary">
              View More Works
            </Link>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="artwork-related">
          <p className="artwork-section-label artwork-related-label">
            More from {artwork.collection}
          </p>
          <div className="artwork-related-grid">
            {related.map((item) => (
              <Link
                to={`/artwork/${item.id}`}
                className="related-card"
                key={item.id}
              >
                <img src={getImageSrc(item, 600)} alt={item.title} loading="lazy" />
                <p>{item.title}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
