import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Ricky Salim Art</h1>
      <p>Art • Faith • Community</p>

      <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
        <Link to="/gallery">
          <button>View Gallery</button>
        </Link>

        <Link to="/about">
          <button>About the Artist</button>
        </Link>

        <Link to="/enquiry">
          <button>Enquiry</button>
        </Link>
      </div>
    </main>
  );
}
