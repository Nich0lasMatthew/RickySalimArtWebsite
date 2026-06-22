import { Link } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
  return (
    <header className="site-navbar">
      <div className="site-logo">
        <Link to="/">RickySalimArt</Link>
      </div>

      <nav className="site-nav-links">
        <Link to="/gallery">Gallery</Link>
        <Link to="/about">About</Link>
        <Link to="/enquiry">Enquiry</Link>
      </nav>
    </header>
  );
}
