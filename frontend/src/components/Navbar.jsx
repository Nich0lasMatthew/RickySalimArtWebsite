import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth/context";
import "./Navbar.css";

const LINKS = [
  { to: "/gallery", label: "Gallery" },
  { to: "/carrot-cards", label: "Carrot Cards" },
  { to: "/about", label: "About" },
  { to: "/enquiry", label: "Enquiry" },
];

/**
 * Site navigation.
 * - `overlay`: sits transparently on top of a dark banner (home page) and turns
 *   into a frosted bar once you scroll past the top.
 * - On phones the links collapse into a menu button that opens a full-screen menu.
 */
export default function Navbar({ overlay = false }) {
  const { user, role, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const menuButton = useRef(null);
  const firstLink = useRef(null);

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  // Close the menu whenever the page changes.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setOpen(false);
  }

  // While the full-screen menu is open: lock page scroll, Escape closes, focus the first link.
  useEffect(() => {
    if (!open) return;
    const button = menuButton.current;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstLink.current?.focus();
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      button?.focus();
    };
  }, [open]);

  const transparent = overlay && !scrolled && !open;
  const accountLink = !loading && (user ? { to: "/account", label: "Account" } : { to: "/login", label: "Sign in" });
  const links = [...LINKS, ...(!loading && role === "admin" ? [{ to: "/admin", label: "Admin" }] : [])];

  return (
    <>
      <header
        className={`site-navbar${overlay ? " is-overlay" : ""}${transparent ? " is-transparent" : ""}${open ? " is-open" : ""}`}
      >
        <Link to="/" className="site-logo">RickySalimArt</Link>

        <nav className="site-nav-links" aria-label="Main">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to}>{l.label}</NavLink>
          ))}
          {accountLink && (
            <NavLink to={accountLink.to} className="site-nav-account">{accountLink.label}</NavLink>
          )}
        </nav>

        <button
          ref={menuButton}
          type="button"
          className="site-menu-button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="site-mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="site-menu-icon" aria-hidden="true">
            <span />
            <span />
          </span>
        </button>
      </header>

      <div
        id="site-mobile-menu"
        className={`site-mobile-menu${open ? " is-open" : ""}`}
        aria-hidden={!open}
        inert={!open}
      >
        <nav aria-label="Main">
          <ul>
            {links.map((l, i) => (
              <li key={l.to} style={{ "--i": i }}>
                <NavLink to={l.to} ref={i === 0 ? firstLink : undefined}>{l.label}</NavLink>
              </li>
            ))}
          </ul>
          {accountLink && (
            <Link to={accountLink.to} className="btn btn-primary site-mobile-account" style={{ "--i": links.length }}>
              {accountLink.label}
            </Link>
          )}
        </nav>
      </div>

      {/* Keeps page content below a fixed bar (not needed on the home banner, which runs underneath it). */}
      {!overlay && <div className="site-navbar-spacer" aria-hidden="true" />}
    </>
  );
}
