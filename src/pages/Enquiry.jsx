import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Enquiry.css";

const CONTACT_EMAIL = "rickybpainting@gmail.com";

export default function Enquiry() {
  const [searchParams] = useSearchParams();
  const artworkParam = searchParams.get("artwork") || "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(
    artworkParam ? `I'm interested in "${artworkParam}".` : ""
  );
  const [sent, setSent] = useState(false);

  const mailtoHref = useMemo(() => {
    const subject = artworkParam
      ? `Enquiry: ${artworkParam}`
      : "Enquiry from RickySalimArt";
    const body = `${message}\n\n— ${name}\n${email}`;
    return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  }, [artworkParam, message, name, email]);

  const handleSubmit = (e) => {
    e.preventDefault();
    window.location.href = mailtoHref;
    setSent(true);
  };

  return (
    <div className="enquiry-page">
      <Navbar />

      <section className="enquiry-header">
        <p className="enquiry-kicker">Get in Touch</p>
        <h1>Enquiry</h1>
        <p className="enquiry-intro">
          Interested in a piece, a commission, or just want to say hello?
          Send a message below — it will open in your email client, ready
          to send.
        </p>
      </section>

      <section className="enquiry-form-wrap">
        <form className="enquiry-form" onSubmit={handleSubmit}>
          {artworkParam && (
            <div className="enquiry-artwork-tag">
              Regarding: <strong>{artworkParam}</strong>
            </div>
          )}

          <label className="enquiry-field">
            <span>Name</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </label>

          <label className="enquiry-field">
            <span>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label className="enquiry-field">
            <span>Message</span>
            <textarea
              required
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us a little about what you're looking for..."
            />
          </label>

          <button type="submit" className="btn btn-primary enquiry-submit">
            Send Enquiry
          </button>

          {sent && (
            <p className="enquiry-sent-note">
              Your email client should now be open with this message ready
              to send. If nothing happened, you can email us directly at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
