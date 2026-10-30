import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Account.css";

export default function NotFound() {
  return (
    <div className="acct-page">
      <Navbar />
      <section className="acct-center">
        <h1>Page not found</h1>
        <p className="acct-muted">The page you're looking for has moved or doesn't exist.</p>
        <Link to="/" className="btn btn-primary">Go home</Link>
      </section>
    </div>
  );
}
