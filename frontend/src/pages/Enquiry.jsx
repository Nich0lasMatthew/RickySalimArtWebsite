import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, submitEnquiry } from "../api/client";
import Navbar from "../components/Navbar";
import "./Enquiry.css";

const EMPTY_FORM = { name: "", email: "", message: "", website: "" };

export default function Enquiry() {
  // The artwork page links here as /enquiry?artwork=<title>
  const [searchParams] = useSearchParams();
  const artwork = searchParams.get("artwork") ?? "";

  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    setFieldErrors({});
    setError("");

    try {
      await submitEnquiry({
        name: form.name,
        email: form.email,
        message: form.message,
        website: form.website, // hidden honeypot, must stay empty for real visitors
        ...(artwork ? { artwork } : {}),
      });
      setForm(EMPTY_FORM);
      setStatus("sent");
    } catch (err) {
      if (err instanceof ApiError && err.status !== 0) {
        setFieldErrors(err.fields ?? {});
        setError(
          err.status === 429
            ? "You've sent a few enquiries already. Please try again later."
            : err.status === 400
            ? "Please check the highlighted fields."
            : "Something went wrong. Please try again."
        );
      } else {
        setError("Couldn't reach the server. Please try again in a moment.");
      }
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="enquiry-page">
        <Navbar />
        <section className="enquiry-header enquiry-success">
          <p className="enquiry-kicker">Enquiry Sent</p>
          <h1>Thank you</h1>
          <p className="enquiry-intro">
            Your message has been received. Ricky will get back to you by email,
            usually within a few days.
          </p>
          <div className="enquiry-success-actions">
            <Link to="/gallery" className="btn btn-primary">
              Back to Gallery
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const sending = status === "sending";

  return (
    <div className="enquiry-page">
      <Navbar />

      <section className="enquiry-header">
        <p className="enquiry-kicker">Get in Touch</p>
        <h1>Make an Enquiry</h1>
        <p className="enquiry-intro">
          Interested in a piece, a commission, or a set of Carrot Cards? Send a
          message and Ricky will reply personally.
        </p>
      </section>

      <div className="enquiry-form-wrap">
        <form className="enquiry-form" onSubmit={handleSubmit} noValidate>
          {artwork && (
            <p className="enquiry-artwork-tag">
              Enquiring about: <strong>{artwork}</strong>
            </p>
          )}

          <label className="enquiry-field">
            <span>Name</span>
            <input
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              maxLength={100}
              autoComplete="name"
              aria-invalid={Boolean(fieldErrors.name)}
              required
            />
            {fieldErrors.name && <em className="enquiry-error">{fieldErrors.name[0]}</em>}
          </label>

          <label className="enquiry-field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              maxLength={200}
              autoComplete="email"
              aria-invalid={Boolean(fieldErrors.email)}
              required
            />
            {fieldErrors.email && <em className="enquiry-error">{fieldErrors.email[0]}</em>}
          </label>

          <label className="enquiry-field">
            <span>Message</span>
            <textarea
              name="message"
              rows={6}
              value={form.message}
              onChange={handleChange}
              maxLength={2000}
              placeholder={artwork ? `I'd love to know more about "${artwork}"…` : ""}
              aria-invalid={Boolean(fieldErrors.message)}
              required
            />
            {fieldErrors.message && <em className="enquiry-error">{fieldErrors.message[0]}</em>}
          </label>

          {/* Honeypot: hidden from people, tempting to bots */}
          <div className="enquiry-honeypot" aria-hidden="true">
            <label>
              Leave this empty
              <input
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={handleChange}
              />
            </label>
          </div>

          {error && (
            <p className="enquiry-error enquiry-error-banner" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary enquiry-submit" disabled={sending}>
            {sending ? "Sending…" : "Send Enquiry"}
          </button>

          <p className="enquiry-sent-note">
            Prefer to browse first? <Link to="/gallery">Visit the gallery</Link>.
          </p>
        </form>
      </div>
    </div>
  );
}
