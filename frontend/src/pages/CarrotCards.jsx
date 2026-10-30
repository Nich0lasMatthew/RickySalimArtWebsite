import { useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { useHeroStyle } from "../hooks/useHeroImage";
import "./CarrotCards.css";

/* ----------------------------------------------------------------
   DATA
   Each card only carries content — no hardcoded colors. Every visual
   (art, tags, borders) pulls from the site's existing CSS variables
   (--bg, --text, --accent, --text-muted, --text-faint, --border,
   --border-strong, --bg-soft) so this page can never drift from the
   rest of the site's palette or fonts.
------------------------------------------------------------------- */

const CARDS = [
  { t: "The Open Door", cat: "direction", word: "A way is opening that you didn't force and can't fully explain. Walk toward it slowly — you don't need to kick it down.", ref: "Revelation 3:8" },
  { t: "Living Water", cat: "comfort", word: "What feels dry right now is not the end of the story. Something under the surface is already rising to meet you.", ref: "John 4:14" },
  { t: "The Sower's Field", cat: "encouragement", word: "Seed you planted in secret — in tears, in seasons no one saw — did not fall on stone. Growth is happening below ground.", ref: "Mark 4:26" },
  { t: "New Wine", cat: "revelation", word: "An old container won't hold what's coming. Let go of the shape you assumed this next season had to take.", ref: "Luke 5:37" },
  { t: "The Anchor", cat: "comfort", word: "You are held by something outside the storm — not immune to it, but not at its mercy either.", ref: "Hebrews 6:19" },
  { t: "Refiner's Fire", cat: "revelation", word: "The heat isn't punishment. It's precision — removing only what was never meant to stay.", ref: "Malachi 3:3" },
  { t: "Wings Like Eagles", cat: "encouragement", word: "Strength is being renewed even in the waiting. You were never meant to run this on your own power.", ref: "Isaiah 40:31" },
  { t: "The Vine and Branches", cat: "direction", word: "Fruit isn't produced by striving harder. Stay attached, and let life flow from the source.", ref: "John 15:5" },
  { t: "Living Bread", cat: "comfort", word: "You've been trying to feed yourself with things that were never meant to sustain you.", ref: "John 6:35" },
  { t: "The Lighthouse", cat: "direction", word: "Steady, not flashy — that's the kind of guidance headed your way.", ref: "Psalm 119:105" },
  { t: "Broken Chains", cat: "revelation", word: "Something that's held you for a long time is loosening, link by link, whether you feel it yet or not.", ref: "Isaiah 61:1" },
  { t: "The Potter's Hand", cat: "comfort", word: "You're not being discarded for the cracks. You're being reshaped around them.", ref: "Jeremiah 18:6" },
  { t: "Still Waters", cat: "comfort", word: "Rest isn't a reward you earn after the work. It's being offered to you now, in the middle of it.", ref: "Psalm 23:2" },
  { t: "The Watchman's Tower", cat: "direction", word: "Stay alert but not anxious. What you're watching for is closer than it looks from the ground.", ref: "Habakkuk 2:1" },
  { t: "New Wineskins", cat: "encouragement", word: "You're being made flexible enough to hold something bigger than your old capacity.", ref: "Matthew 9:17" },
  { t: "The Narrow Gate", cat: "direction", word: "Fewer people go this way — not because it's unkind, but because it asks for honesty.", ref: "Matthew 7:14" },
  { t: "Living Stones", cat: "encouragement", word: "You're not just being fixed. You're being built into something, on purpose, with other people.", ref: "1 Peter 2:5" },
  { t: "The Good Shepherd", cat: "comfort", word: "You are being looked for, by name, even in the terrain you wandered into alone.", ref: "John 10:14" },
  { t: "Fire and Wind", cat: "revelation", word: "Don't be afraid of the intensity. Something is being lit that was meant to spread, not stay contained.", ref: "Acts 2:3" },
  { t: "The Harvest Field", cat: "encouragement", word: "What looked like a long, unproductive season was actually ripening. It's closer to harvest than it appears.", ref: "John 4:35" },
  { t: "Mountain Mover", cat: "direction", word: "The obstacle isn't there to stop you. It's there to show you what you actually believe.", ref: "Mark 11:23" },
  { t: "The King's Table", cat: "comfort", word: "You're being invited to sit, not to prove you belong there. The invitation already settled that.", ref: "Psalm 23:5" },
  { t: "Overflowing Cup", cat: "encouragement", word: "What's been poured into you was never meant to stop at the rim.", ref: "Psalm 23:5" },
  { t: "Wells of Salvation", cat: "revelation", word: "There's a source available to you that hasn't been drawn from yet — deeper than what you've been sipping.", ref: "Isaiah 12:3" },
];

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

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
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

/**
 * Builds the card's "painting" using only two colors pulled from the site's
 * own theme (--accent and --text), so every card matches the site no
 * matter what palette is in use. Cards are told apart by composition
 * (position, scale, rotation) rather than by introducing new colors.
 */
function generateArt(seedNum, theme, pxWidth, pxHeight) {
  const rnd = mulberry32(seedNum);
  const w = pxWidth || "100%";
  const h = pxHeight || "100%";
  let shapes = "";
  for (let i = 0; i < 5; i++) {
    const cx = 20 + rnd() * 260;
    const cy = 20 + rnd() * 180;
    const r = 55 + rnd() * 85;
    const col = i % 2 === 0 ? theme.accent : theme.text;
    const op = 0.08 + rnd() * 0.14;
    shapes += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}" opacity="${op.toFixed(2)}" filter="url(#blur${seedNum})"/>`;
  }
  let rays = "";
  const originX = 60 + rnd() * 180;
  const originY = 20 + rnd() * 40;
  for (let i = 0; i < 6; i++) {
    const angle = rnd() * 1.4 - 0.7 + (i - 3) * 0.22;
    const len = 220 + rnd() * 60;
    const x2 = originX + Math.sin(angle) * len;
    const y2 = originY + Math.cos(angle) * len;
    rays += `<line x1="${originX}" y1="${originY}" x2="${x2}" y2="${y2}" stroke="${theme.accent}" stroke-width="${(1 + rnd() * 1.5).toFixed(1)}" opacity="${(0.05 + rnd() * 0.09).toFixed(2)}"/>`;
  }
  return `
  <svg viewBox="0 0 300 240" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="blur${seedNum}" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="24"/>
      </filter>
    </defs>
    <rect width="300" height="240" fill="${theme.bg}"/>
    ${shapes}
    ${rays}
  </svg>`;
}

function svgToDataUri(svgStr) {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
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
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/* ----------------------------------------------------------------
   COMPONENT
------------------------------------------------------------------- */

export default function CarrotCards() {
  const [currentIdx, setCurrentIdx] = useState(() => dayIndex(CARDS.length));
  const [revealed, setRevealed] = useState(false);
  const heroStyle = useHeroStyle();
  const [shareStatus, setShareStatus] = useState("");
  const [sharing, setSharing] = useState(false);

  const artSrc = useMemo(
    () => svgToDataUri(generateArt(currentIdx * 97 + 13, readTheme())),
    [currentIdx]
  );

  const card = CARDS[currentIdx];

  function handleRevealToday() {
    setCurrentIdx(dayIndex(CARDS.length));
    setRevealed(true);
  }

  function handleShuffle() {
    setRevealed(false);
    window.setTimeout(() => {
      let next = Math.floor(Math.random() * CARDS.length);
      if (next === currentIdx) next = (next + 1) % CARDS.length;
      setCurrentIdx(next);
      window.setTimeout(() => setRevealed(true), 150);
    }, 260);
  }

  async function handleShare() {
    setSharing(true);
    setShareStatus("Preparing image…");
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const theme = readTheme();
      const W = 1080, H = 1350, artH = 760;
      const svgStr = generateArt(currentIdx * 97 + 13, theme, W, artH);
      const artImg = await loadImage(svgToDataUri(svgStr));

      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(artImg, 0, 0, W, artH);
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, artH, W, H - artH);

      let y = artH + 90;
      const marginX = 80;
      const maxW = W - marginX * 2;

      ctx.font = "500 26px Georgia, 'Times New Roman', serif";
      ctx.fillStyle = theme.accent;
      ctx.fillText(CATEGORY_LABELS[card.cat].toUpperCase(), marginX, y);
      y += 64;

      ctx.font = "600 58px Georgia, 'Times New Roman', serif";
      ctx.fillStyle = theme.text;
      ctx.fillText(card.t, marginX, y);
      y += 66;

      ctx.font = "italic 400 38px Georgia, 'Times New Roman', serif";
      ctx.fillStyle = theme.text;
      const lines = wrapLines(ctx, card.word, maxW);
      for (const line of lines) {
        y += 50;
        ctx.fillText(line, marginX, y);
      }

      y += 56;
      ctx.font = "400 26px Georgia, 'Times New Roman', serif";
      ctx.fillStyle = theme.accent;
      ctx.fillText(card.ref.toUpperCase(), marginX, y);

      ctx.font = "400 22px Georgia, 'Times New Roman', serif";
      ctx.fillStyle = theme.textMuted;
      const wm = "CARROT CARDS";
      const wmW = ctx.measureText(wm).width;
      ctx.fillText(wm, W - marginX - wmW, H - 60);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.95));
      const filename = `carrot-card-${slugify(card.t)}.png`;
      const file = new File([blob], filename, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Carrot Card", text: card.t });
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
      <section className="hero carrot-hero" style={heroStyle}>
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
          <div className={`carrot-card-frame ${revealed ? "is-revealed" : ""}`}>
            {artSrc && <img src={artSrc} alt="" className="artwork-image carrot-art" />}
            {!revealed && (
              <div className="carrot-card-veil">
                <span className="artwork-kicker">Tap reveal to begin</span>
              </div>
            )}
          </div>
        </div>

        <div className="artwork-info-col">
          <p className="artwork-kicker">Card of the Day</p>
          <h1>{revealed ? card.t : "Waiting to be drawn"}</h1>
          <p className="artwork-artist">
            {new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
          </p>

          <dl className="artwork-details">
            <div className="artwork-detail-row">
              <dt>Category</dt>
              <dd>{revealed ? CATEGORY_LABELS[card.cat] : "—"}</dd>
            </div>
            <div className="artwork-detail-row">
              <dt>Reference</dt>
              <dd>{revealed ? card.ref : "—"}</dd>
            </div>
          </dl>

          <p className="artwork-section-label">The Word</p>
          <blockquote className="artwork-prophetic">
            <p className="artwork-prophetic-text">
              {revealed ? card.word : "Tap the card to let it speak."}
            </p>
          </blockquote>

          <div className="artwork-actions">
            <button className="btn btn-primary" onClick={handleRevealToday}>
              Reveal today's card
            </button>
            <button className="btn btn-secondary" onClick={handleShuffle}>
              Draw another
            </button>
            <button className="btn btn-secondary" onClick={handleShare} disabled={sharing}>
              {sharing ? "Preparing…" : "Share as image"}
            </button>
          </div>
          {shareStatus && <p className="carrot-share-status">{shareStatus}</p>}
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
            Each card holds an original abstract painting, meant to be looked at slowly
            rather than decoded like a caption. God has always used ordinary material to
            say extraordinary things — a burning bush, a fistful of seed, a jar of oil,
            five loaves. A Carrot Card works on the same principle: the image is simple;
            what it's carrying isn't.
          </p>
        </div>
      </section>

      {/* ---------- HOW TO USE ---------- */}
      <section id="carrot-how" className="featured-section">
        <div className="section-heading">
          <p>A Short Liturgy</p>
          <h2>How to use the deck</h2>
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
