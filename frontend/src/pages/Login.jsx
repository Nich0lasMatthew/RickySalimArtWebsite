import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../auth/context";
import { firebaseConfigured } from "../lib/firebase";
import { authErrorMessage, resetPassword, signIn, signInWithGoogle, signUp } from "../lib/auth";
import "./Account.css";

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const goTo = location.state?.from || "/account";

  const [mode, setMode] = useState("signin"); // signin | signup | reset
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (!loading && user) return <Navigate to={goTo} replace />;

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const switchMode = (next) => {
    setMode(next);
    setError("");
    setNotice("");
  };

  async function run(action) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (mode === "reset") {
      return run(async () => {
        await resetPassword(form.email);
        setNotice("If there's an account for that email, a reset link is on its way.");
      });
    }
    if (mode === "signup" && form.password.length < 8) {
      return setError("Please choose a password of at least 8 characters.");
    }
    return run(async () => {
      if (mode === "signup") await signUp(form.name, form.email, form.password);
      else await signIn(form.email, form.password);
      navigate(goTo, { replace: true });
    });
  }

  const google = () =>
    run(async () => {
      await signInWithGoogle();
      navigate(goTo, { replace: true });
    });

  const title = { signin: "Sign in", signup: "Create an account", reset: "Reset your password" }[mode];

  return (
    <div className="acct-page">
      <Navbar />
      <section className="acct-narrow">
        <p className="acct-kicker">Your Account</p>
        <h1>{title}</h1>

        {!firebaseConfigured && (
          <p className="acct-error" role="alert">
            Sign-in isn't set up yet. Add the Firebase settings to frontend/.env.local.
          </p>
        )}

        {mode !== "reset" && (
          <>
            <button type="button" className="btn acct-btn-outline acct-full" onClick={google} disabled={busy}>
              Continue with Google
            </button>
            <p className="acct-divider"><span>or with email</span></p>
          </>
        )}

        <form className="acct-form" onSubmit={handleSubmit} noValidate>
          {mode === "signup" && (
            <label className="acct-field">
              <span>Name</span>
              <input name="name" value={form.name} onChange={change} autoComplete="name" maxLength={100} />
            </label>
          )}
          <label className="acct-field">
            <span>Email</span>
            <input name="email" type="email" value={form.email} onChange={change} autoComplete="email" required />
          </label>
          {mode !== "reset" && (
            <label className="acct-field">
              <span>Password</span>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={change}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                minLength={mode === "signup" ? 8 : undefined}
                required
              />
            </label>
          )}

          {error && <p className="acct-error" role="alert">{error}</p>}
          {notice && <p className="acct-notice" role="status">{notice}</p>}

          <button type="submit" className="btn btn-primary acct-full" disabled={busy}>
            {busy ? "Please wait…" : { signin: "Sign in", signup: "Create account", reset: "Send reset link" }[mode]}
          </button>
        </form>

        <div className="acct-switch">
          {mode === "signin" && (
            <>
              <button type="button" onClick={() => switchMode("reset")}>Forgot your password?</button>
              <button type="button" onClick={() => switchMode("signup")}>New here? Create an account</button>
            </>
          )}
          {mode !== "signin" && (
            <button type="button" onClick={() => switchMode("signin")}>Back to sign in</button>
          )}
        </div>

        <p className="acct-muted acct-small">
          You don't need an account to browse or <Link to="/enquiry">send an enquiry</Link>.
        </p>
      </section>
    </div>
  );
}
