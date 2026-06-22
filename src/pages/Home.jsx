import { Link } from "react-router-dom";
import data from "../data/catalog_cleaned.json";
import { getImageSrc } from "../utils/artwork";
import Navbar from "../components/Navbar";
import "./Home.css";

export default function Home() {
  const featured = data.filter(
    (item) =>
      item.id === "words" ||
      item.id === "the-shepherd" ||
      item.id === "anchored-in-hope-ready-to-rise"
  );

  return (
    <div className="home-page">
      <Navbar />

      <section className="hero">
        <div className="hero-overlay">
          <p className="hero-kicker">Art • Faith • Community</p>
          <h1>Ricky B. Salim</h1>
          <p className="hero-text">
            A quiet digital space where original artworks carry reflection,
            hope, and the gentle invitation of faith.
          </p>

          <div className="hero-buttons">
            <Link to="/gallery" className="btn btn-primary">
              View Gallery
            </Link>
            <Link to="/about" className="btn btn-secondary">
              About the Artist
            </Link>
          </div>
        </div>
      </section>

      <section className="featured-section">
        <div className="section-heading">
          <p>Featured Works</p>
          <h2>Art that invites reflection</h2>
        </div>

        <div className="featured-grid">
          {featured.map((item) => (
            <Link to={`/artwork/${item.id}`} className="featured-card" key={item.id}>
              <img
                src={getImageSrc(item)}
                alt={item.title}
                className="featured-image"
              />
              <div className="featured-body">
                <h3>{item.title}</h3>
                <p>{item.collection}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="vision-section">
        <div className="vision-content">
          <p className="section-label">Vision</p>
          <h2>More than a gallery</h2>
          <p>
            RickySalimArt is designed as a space of encounter—where viewers can
            experience art, engage with meaning, and choose their level of
            depth. Art leads the experience, while faith is revealed gently and
            respectfully.
          </p>

          <div className="vision-actions">
            <Link to="/gallery" className="btn btn-primary">
              Explore the Gallery
            </Link>
            <Link to="/enquiry" className="btn btn-secondary">
              Make an Enquiry
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
