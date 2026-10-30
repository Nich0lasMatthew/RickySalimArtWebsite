import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sendEmailVerification } from "firebase/auth";
import Navbar from "../components/Navbar";
import { useAuth } from "../auth/context";
import { fetchMe } from "../api/client";
import { signOut } from "../lib/auth";
import "./Account.css";

export default function Account() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [apiError, setApiError] = useState("");
  const [verifySent, setVerifySent] = useState(false);

  // Registers the user with the API (creates users/{uid}) and confirms the role.
  useEffect(() => {
    const controller = new AbortController();
    fetchMe({ signal: controller.signal })
      .then(setProfile)
      .catch((err) => {
        if (err.name !== "AbortError") setApiError("Couldn't reach the server, some details may be missing.");
      });
    return () => controller.abort();
  }, [user]);

  async function handleSignOut() {
    await signOut();
    navigate("/", { replace: true });
  }

  const name = user.displayName || profile?.name;

  return (
    <div className="acct-page">
      <Navbar />
      <section className="acct-narrow">
        <p className="acct-kicker">Your Account</p>
        <h1>{name ? `Hello, ${name}` : "Hello"}</h1>

        <dl className="acct-details">
          <div><dt>Email</dt><dd>{user.email}</dd></div>
          <div><dt>Account type</dt><dd>{role === "admin" ? "Administrator" : "Collector"}</dd></div>
        </dl>

        {!user.emailVerified && user.providerData.some((p) => p.providerId === "password") && (
          <div className="acct-notice">
            Please confirm your email address using the link we sent you.{" "}
            <button
              type="button"
              className="acct-link"
              disabled={verifySent}
              onClick={() => sendEmailVerification(user).then(() => setVerifySent(true))}
            >
              {verifySent ? "Sent" : "Send it again"}
            </button>
          </div>
        )}

        {apiError && <p className="acct-error">{apiError}</p>}

        <div className="acct-section">
          <h2>Orders</h2>
          <p className="acct-muted">
            Purchases you make will appear here. In the meantime, you can{" "}
            <Link to="/enquiry">enquire about any piece</Link>.
          </p>
        </div>

        <div className="acct-actions">
          {role === "admin" && (
            <Link to="/admin" className="btn btn-primary">Open admin</Link>
          )}
          <button type="button" className="btn acct-btn-outline" onClick={handleSignOut}>
            Sign out
          </button>
        </div>

      </section>
    </div>
  );
}
