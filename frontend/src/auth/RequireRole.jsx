import { Navigate, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "./context";

/**
 * Wraps a page that needs a signed-in user (role="customer") or an admin.
 * Visitors are sent to /login and brought back afterwards.
 */
export default function RequireRole({ role = "customer", children }) {
  const { user, role: current, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="acct-page">
        <Navbar />
        <p className="acct-center acct-muted">Loading…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (role === "admin" && current !== "admin") {
    return (
      <div className="acct-page">
        <Navbar />
        <section className="acct-center">
          <h1>Not available</h1>
          <p className="acct-muted">This page is for site administrators.</p>
        </section>
      </div>
    );
  }

  return children;
}
