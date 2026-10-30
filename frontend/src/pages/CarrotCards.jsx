import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useArtworks } from "../hooks/useArtworks";
import { getImageSrc } from "../utils/artwork";
import "./CarrotCards.css";

/* ----------------------------------------------------------------
   DATA
   The cards themselves are Ricky's Carrot Card paintings from the catalog
   (collection "Carrot Cards"): image, title and prophetic word.
------------------------------------------------------------------- */

const CATEGORY_LABELS = {
  encouragement: "Encouragement",
  direction: "Direction",
  comfort: "Comfort",
  revelation: "Revelation",
};

const MOVEMENTS = [
  { n: "I", h: "Invite the Spirit", p: "Begin in prayer. Ask the Holy Spirit to lead, so that whoever draws a card might simply become a vessel — for encouragement, for a word of wisdom, for a word of knowledge." },
  { n: "II", h: "Name what's happening", p: "Remind whoever you're with that God can speak through anyone, and through any medium — including a picture. The card isn't the source. It's one of the ordinary, creative ways He chooses to communicate His heart." },
  { n: "III", h: "Draw", p: "Shuffle the deck and lay it out. Invite the person to choose one card, staying open and sensitive to the Spirit rather than picking with their head." },
  { n: "IV", h: "Listen", p: "Once a card is chosen, pray again and ask for insight. Let the image speak. Listen for what the Lord might want to say through it — encouragement, direction, comfort, or revelation." },
  { n: "V", h: "Release a blessing", p: "Speak a blessing over the person based on whatever has been revealed or ministered through the card. Keep it in their language, not yours." },
  { n: "VI", h: "Give thanks", p: "Close the session with a prayer of thanksgiving, whether the word felt small or enormous. Every seed is worth thanking God for." },
];

const IDEAS = [
  { label: "Journal", h: "A private trail", p: "Save each day's card alongside what you sensed, so months later you can see how a word actually played out." },
  { label: "Group mode", h: "Pass it around a circle", p: "One phone, one deck — each person draws for the person next to them, out loud, in turn." },
  { label: "Seasons", h: "Rotating decks", p: "An Advent deck, a Harvest deck, a New Year deck — fresh art and words tied to the church calendar." },
  { label: "Reminder", h: "A daily nudge", p: "An optional notification at a chosen hour, the same way a Bible app nudges you toward a verse." },
  { label: "Testimony wall", h: "What others heard", p: "An anonymous, moderated wall where people can post what a card ended up meaning for them." },
  { label: "Print deck", h: "A physical version", p: "A print-ready PDF of the full deck for ministries who'd rather hold actual cards." },
];

/* ----------------------------------------------------------------
   THEME + ART HELPERS
------------------------------------------------------------------- */

function readTheme() {
  const s = getComputedStyle(document.documentElement);
  const get = (name, fallback) => (s.getPropertyValue(name) || "").trim() || fallback;
  return {
    bg: get("--bg", "#faf7f2"),
    text: get("--text", "#1a1a1a"),
    accent: get("--accent", "#8a6d4a"),
    textMuted: get("--text-muted", "#555555"),
    border: get("--border", "rgba(0,0,0,0.12)"),
  };
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

function dayIndex(len) {
  const d = new Date();
  const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  return Math.abs(hashStr(key)) % len;
}

/** The catalog text keeps the PDF's line breaks; turn them back into sentences. */
function cleanWord(text = "") {
  return text.replace(/\s*\n\s*/g, " ").replace(/\s+\.\./g, "…").trim();
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // hosted images need CORS to be drawn on a canvas
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/* ----------------------------------------------------------------
   COMPONENT
------------------------------------------------------------------- */

export default function CarrotCards() {
  const { artworks } = useArtworks();
  const cards = useMemo(
    () =>
      artworks
        .filter((a) => a.collection === "Carrot Cards")
        .map((a) => ({ id: a.id, title: a.title, word: cleanWord(a.prophetic_word), image: getImageSrc(a) })),
    [artworks]
  );

  const [pick, setPick] = useState(null); // index chosen by "Draw another"; null = today's card
  const [revealed, setRevealed] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [sharing, setSharing] = useState(false);

  const count = cards.length;
  const currentIdx = count ? (pick ?? dayIndex(count)) % count : 0;
  const card = cards[currentIdx];
  const isToday = pick === null;

  function handleRevealToday() {
    setPick(null);
    setRevealed(true);
  }

  function handleCardTap() {
    if (!revealed) setRevealed(true);
  }

  function handleShuffle() {
    if (count < 2) return;
    setRevealed(false);
    window.setTimeout(() => {
      let next = Math.floor(Math.random() * count);
      if (next === currentIdx) next = (next + 1) % count;
      setPick(next);
      window.setTimeout(() => setRevealed(true), 150);
    }, 260);
  }

  async function handleShare() {
    if (!card) return;
    setSharing(true);
    setShareStatus("Preparing image…");
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const theme = readTheme();
      const W = 1080, H = 1620, artH = 1080 * 1.25 * 0.72;
      const art = await loadImage(card.image);

      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, W, H);

      // painting, cropped to fill the top area
      const scale = Math.max(W / art.width, artH / art.height);
      const dw = art.width * scale, dh = art.height * scale;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, artH);
      ctx.clip();
      ctx.drawImage(art, (W - dw) / 2, (artH - dh) / 2, dw, dh);
      ctx.restore();

      let y = artH + 90;
      const marginX = 80;
      const maxW = W - marginX * 2;

      ctx.font = "500 24px Georgia, 'Times New Roman', serif";
      ctx.fillStyle = theme.accent;
      ctx.fillText("CARROT CARDS", marginX, y);
      y += 62;

      ctx.font = "600 54px Georgia, 'Times New Roman', serif";
      ctx.fillStyle = theme.text;
      for (const line of wrapLines(ctx, card.title, maxW)) {
        ctx.fillText(line, marginX, y);
        y += 62;
      }

      ctx.font = "italic 400 32px Georgia, 'Times New Roman', serif";
      const lines = wrapLines(ctx, card.word, maxW).slice(0, 7);
      for (const line of lines) {
        y += 44;
        ctx.fillText(line, marginX, y);
      }

      ctx.font = "400 22px Georgia, 'Times New Roman', serif";
      ctx.fillStyle = theme.textMuted;
      const wm = "RICKY B. SALIM";
      ctx.fillText(wm, W - marginX - ctx.measureText(wm).width, H - 60);

      const blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
      );
      const filename = `carrot-card-${slugify(card.title)}.png`;
      const file = new File([blob], filename, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Carrot Card", text: card.title });
        setShareStatus("");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setShareStatus("Image downloaded — attach it wherever you like.");
      }
    } catch (err) {
      if (err && err.name !== "AbortError") {
        setShareStatus("Couldn't create the image — try again.");
      } else {
        setShareStatus("");
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="carrot-page">
      <Navbar />

      {/* ---------- HERO ---------- */}
      <section className="hero carrot-hero">
        <div className="hero-overlay">
          <p className="hero-kicker">A Prophetic Image Practice</p>
          <h1>Let a picture say what words can't.</h1>
          <p className="hero-text">
            Carrot Cards are a deck of image cards for prayer and prophecy. Draw one,
            sit with the painting, and listen for what the Lord might be saying through
            it — the way He once spoke through a field, a vine, a jar of water.
          </p>
          <div className="hero-buttons">
            <a href="#carrot-draw" className="btn btn-primary">Draw Today's Card</a>
            <a href="#carrot-how" className="btn btn-secondary">How to Use It</a>
          </div>
        </div>
      </section>

      {/* ---------- DRAW ---------- */}
      <section id="carrot-draw" className="artwork-main carrot-draw">
        <div className="artwork-image-col">
          <button
            type="button"
            className={`carrot-card-frame ${revealed ? "is-revealed" : ""}`}
            onClick={handleCardTap}
            aria-label={revealed ? card?.title : "Reveal the card"}
            aria-pressed={revealed}
            disabled={!card}
          >
            {card && (
              <img
                key={card.id}
                src={card.image}
                alt={revealed ? card.title : ""}
                className="artwork-image carrot-art"
              />
            )}
            {!revealed && (
              <span className="carrot-card-veil">
                <span className="carrot-veil-label">Tap the card to reveal</span>
              </span>
            )}
          </button>
        </div>

        <div className="artwork-info-col">
          <p className="artwork-kicker">{isToday ? "Card of the Day" : "Your Card"}</p>
          <h1>{revealed && card ? card.title : "Waiting to be drawn"}</h1>
          <p className="artwork-artist">
            {new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
          </p>

          <dl className="artwork-details">
            <div className="artwork-detail-row">
              <dt>Card</dt>
              <dd>{revealed && card ? `${currentIdx + 1} of ${count}` : "—"}</dd>
            </div>
            <div className="artwork-detail-row">
              <dt>Artist</dt>
              <dd>Ricky B. Salim</dd>
            </div>
          </dl>

          <p className="artwork-section-label">The Word</p>
          <blockquote className="artwork-prophetic">
            <p className="artwork-prophetic-text">
              {revealed && card ? card.word : "Take a moment, then tap the card to let it speak."}
            </p>
          </blockquote>

          <div className="artwork-actions">
            {revealed ? (
              <Link to={`/artwork/${card.id}`} className="btn btn-primary">
                View this card
              </Link>
            ) : (
              <button className="btn btn-primary" onClick={handleRevealToday} disabled={!card}>
                Reveal today's card
              </button>
            )}
            <button className="btn btn-secondary" onClick={handleShuffle} disabled={count < 2}>
              Draw another
            </button>
            <button className="btn btn-secondary" onClick={handleShare} disabled={sharing || !revealed}>
              {sharing ? "Preparing…" : "Share as image"}
            </button>
          </div>
          {shareStatus && <p className="carrot-share-status" role="status">{shareStatus}</p>}
        </div>
      </section>

      {/* ---------- ABOUT ---------- */}
      <section className="vision-section">
        <div className="vision-content">
          <p className="section-label">What It Is</p>
          <h2>Why a root vegetable?</h2>
          <p>
            A carrot grows entirely out of sight. Everything that matters — the shape,
            the sweetness, whether it's ready — happens underground, long before anyone
            can see it. Prophecy tends to work the same way: a word is planted quietly,
            grows in the dark for a while, and only later gets pulled up into the light.
          </p>
          <p>
            Each card holds one of Ricky's original paintings, meant to be looked at
            slowly rather than decoded like a caption. God has always used ordinary material to
            say extraordinary things — a burning bush, a fistful of seed, a jar of oil,
            five loaves. A Carrot Card works on the same principle: the image is simple;
            what it's carrying isn't.
          </p>
        </div>
      </section>

      {/* ---------- HOW TO USE ---------- */}
      <section id="carrot-how" className="featured-section">
        <div className="section-heading carrot-how-heading">
          <p>A Short Liturgy</p>
          <h2>How to use the deck</h2>
          <p className="carrot-how-intro">
            If you have a physical deck of Carrot Cards, this simple liturgy can guide
            your time of prayer — on your own, with a friend, or around a table with a
            small group.
          </p>
        </div>
        <div className="carrot-movements">
          {MOVEMENTS.map((m) => (
            <div className="carrot-movement" key={m.n}>
              <div className="carrot-movement-num">{m.n}</div>
              <div>
                <h3>{m.h}</h3>
                <p>{m.p}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- CATEGORIES ---------- */}
      <section className="featured-section">
        <div className="section-heading">
          <p>Four Shapes a Word Can Take</p>
          <h2>What you might hear</h2>
        </div>
        <div className="carrot-legend-grid">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <div className="carrot-legend-card" key={key}>
              <h3>{label}</h3>
              <p>
                {key === "encouragement" && "A reminder of something true that's easy to forget under pressure."}
                {key === "direction" && "A nudge toward a next step, or permission to stop pushing in the wrong one."}
                {key === "comfort" && "Something for a tired or grieving place that doesn't need fixing, just tending."}
                {key === "revelation" && "A glimpse of something hidden — about God, about a season, about yourself."}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- IDEAS ---------- */}
      <section className="featured-section">
        <div className="section-heading">
          <p>Where This Could Go</p>
          <h2>Ideas worth adding</h2>
        </div>
        <div className="carrot-legend-grid carrot-ideas-grid">
          {IDEAS.map((idea) => (
            <div className="carrot-legend-card" key={idea.label}>
              <p className="artwork-kicker">{idea.label}</p>
              <h3>{idea.h}</h3>
              <p>{idea.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <section className="vision-section">
        <div className="vision-content">
          <p className="artwork-prophetic-text carrot-blessing">
            May what's been growing quietly in you finally see some light.
          </p>
        </div>
      </section>
    </div>
  );
}
