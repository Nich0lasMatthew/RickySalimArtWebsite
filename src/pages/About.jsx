import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./About.css";

export default function About() {
  return (
    <div className="about-page">
      <Navbar />

      <section className="about-main">
        <div className="about-photo-col">
          <img
            src="/artworks/ricky-portrait.jpg"
            alt="Ricky B. Salim"
            className="about-photo"
          />
        </div>

        <div className="about-text-col">
          <p className="about-kicker">About the Artist</p>
          <h1>Ricky B. Salim</h1>
          <p className="about-subtitle">From Photographer to Painter</p>

          <div className="about-body">
            <p>
              Ricky never set out to be a painter. He built his career behind
              a camera — and by his own account, picking up a brush was the
              last thing he expected of himself, especially since he is
              colorblind. When he first felt called to paint, it seemed like
              an impossible request.
            </p>

            <p>
              The calling didn't let up. Ricky found his answer in
              2 Corinthians 12:9 — <em>"My grace is sufficient for you, for
              My power is made perfect in weakness."</em> That verse became
              the starting point. He began to paint anyway, and over time
              his work grew sharper and more expressive. Working with a
              palette knife, building up texture in layers, became the voice
              that felt most like his own.
            </p>

            <p>
              Each piece he makes is an extension of that same conviction —
              a way of putting God's grace into something you can see, stroke
              by stroke.
            </p>

            <p>
              During the pandemic, that practice took a new shape. In daily
              prayer and quiet reflection, Ricky began receiving images he
              felt compelled to paint — small, direct visuals carrying a
              message. He paired them with short, encouraging words and
              called them <strong>Carrot Cards</strong>. What started as a
              personal devotional habit became a way of sharing hope with
              others, and the cards continue to be a source of comfort for
              people facing difficult seasons of their own.
            </p>
          </div>

          <div className="about-actions">
            <Link to="/gallery" className="btn btn-primary">
              View the Gallery
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
