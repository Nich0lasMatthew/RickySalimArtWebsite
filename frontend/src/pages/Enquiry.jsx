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
      if (err instanceof ApiError) {
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
        <section className="enquiry-success">
          <h1>Thank you</h1>
          <p>Your enquiry has been received. We'll be in touch soon.</p>
          <Link to="/gallery" className="btn btn-primary">
            Back to Gallery
          </Link>
        </section>
      </div>
    );
  }

  const sending = status === "sending";

  return (
    <div className="enquiry-page">
      <Navbar />

      <section className="enquiry-header">
        <h1>Make an Enquiry</h1>
        {artwork && (
          <p className="enquiry-artwork">
            About: <strong>{artwork}</strong>
          </p>
        )}
      </section>

      <form className="enquiry-form" onSubmit={handleSubmit} noValidate>
        <div className="enquiry-field">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            maxLength={100}
            autoComplete="name"
            required
          />
          {fieldErrors.name && (
            <p className="enquiry-error">{fieldErrors.name[0]}</p>
          )}
        </div>

        <div className="enquiry-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            maxLength={200}
            autoComplete="email"
            required
          />
          {fieldErrors.email && (
            <p className="enquiry-error">{fieldErrors.email[0]}</p>
          )}
        </div>

        <div className="enquiry-field">
          <label htmlFor="message">Message</label>
          <textarea
            id="message"
            name="message"
            rows={6}
            value={form.message}
            onChange={handleChange}
            maxLength={2000}
            required
          />
          {fieldErrors.message && (
            <p className="enquiry-error">{fieldErrors.message[0]}</p>
          )}
        </div>

        {/* Honeypot: hidden from people, tempting to bots */}
        <div
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", height: 0, overflow: "hidden" }}
        >
          <label htmlFor="website">Leave this empty</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={handleChange}
          />
        </div>

        {error && (
          <p className="enquiry-error enquiry-error-banner" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary" disabled={sending}>
          {sending ? "Sending…" : "Send Enquiry"}
        </button>
      </form>
    </div>
  );
}
