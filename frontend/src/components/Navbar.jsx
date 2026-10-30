import { Link } from "react-router-dom";
import { useAuth } from "../auth/context";
import "./Navbar.css";

export default function Navbar() {
  const { user, role, loading } = useAuth();

  return (
    <header className="site-navbar">
      <div className="site-logo">
        <Link to="/">RickySalimArt</Link>
      </div>

      <nav className="site-nav-links" aria-label="Main">
        <Link to="/gallery">Gallery</Link>
        <Link to="/about">About</Link>
        <Link to="/enquiry">Enquiry</Link>
        <Link to="/carrot-cards">Carrot Cards</Link>
        {!loading && role === "admin" && <Link to="/admin">Admin</Link>}
        {!loading && (
          <Link to={user ? "/account" : "/login"} className="site-nav-account">
            {user ? "Account" : "Sign in"}
          </Link>
        )}
      </nav>
    </header>
  );
}
