"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [pgn, setPgn] = useState("");
  const [pgnError, setPgnError] = useState("");

  const handleAnalyze = () => {
    if (!pgn.trim()) {
      router.push("/analyze");
      return;
    }
    // Basic PGN validation
    if (!pgn.includes("1.") && !pgn.match(/[a-h][1-8]/)) {
      setPgnError("Doesn't look like valid PGN. Try pasting a full game.");
      return;
    }
    const encoded = encodeURIComponent(pgn.trim());
    router.push(`/analyze?pgn=${encoded}`);
  };

  const SAMPLE_GAMES = [
    { name: "Immortal Game", year: "1851", white: "Anderssen", black: "Kieseritzky" },
    { name: "Opera Game", year: "1858", white: "Morphy", black: "Allies" },
    { name: "Game of the Century", year: "1956", white: "Byrne", black: "Fischer" },
  ];

  return (
    <main>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0d0b08;
          color: #c8b896;
          font-family: 'Rajdhani', sans-serif;
          min-height: 100vh;
        }

        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        /* Grain texture overlay */
        .page::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 100;
        }

        /* Background chess pattern */
        .bg-pattern {
          position: fixed;
          inset: 0;
          opacity: 0.03;
          background-image: repeating-conic-gradient(#c8a97e 0% 25%, transparent 0% 50%);
          background-size: 80px 80px;
        }

        /* Radial glow */
        .bg-glow {
          position: fixed;
          top: -20%;
          left: 50%;
          transform: translateX(-50%);
          width: 800px;
          height: 600px;
          background: radial-gradient(ellipse, rgba(200,160,32,0.06) 0%, transparent 70%);
          pointer-events: none;
        }

        nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 48px;
          border-bottom: 1px solid #1e1a14;
          position: relative;
          z-index: 10;
        }

        .nav-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-weight: 600;
          color: #f5e6c8;
          letter-spacing: 0.02em;
        }

        .nav-logo-icon {
          font-size: 28px;
          line-height: 1;
        }

        .nav-links {
          display: flex;
          gap: 32px;
          align-items: center;
        }

        .nav-link {
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #6b5a40;
          text-decoration: none;
          transition: color 0.2s;
          cursor: pointer;
          background: none;
          border: none;
        }
        .nav-link:hover { color: #c8a97e; }

        .nav-cta {
          padding: 8px 20px;
          background: transparent;
          border: 1px solid #c8a020;
          color: #c8a020;
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.2s;
        }
        .nav-cta:hover { background: #c8a020; color: #0d0b08; }

        /* Hero */
        .hero {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 80px 24px 60px;
          position: relative;
          z-index: 10;
        }

        .hero-eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #c8a020;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .hero-eyebrow::before, .hero-eyebrow::after {
          content: '';
          width: 40px; height: 1px;
          background: #c8a020;
          opacity: 0.5;
        }

        .hero-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(52px, 8vw, 96px);
          font-weight: 300;
          line-height: 0.95;
          color: #f5e6c8;
          letter-spacing: -0.02em;
          margin-bottom: 8px;
        }

        .hero-title-accent {
          font-style: italic;
          color: #c8a020;
        }

        .hero-subtitle {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          font-weight: 300;
          font-style: italic;
          color: #8b7355;
          margin: 20px 0 48px;
          max-width: 500px;
          line-height: 1.5;
        }

        /* PGN input */
        .input-group {
          width: 100%;
          max-width: 600px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pgn-textarea {
          width: 100%;
          background: #12100d;
          border: 1px solid #2a2018;
          border-radius: 4px;
          padding: 16px;
          color: #c8b896;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          resize: vertical;
          min-height: 80px;
          max-height: 200px;
          outline: none;
          transition: border-color 0.2s;
          line-height: 1.5;
        }
        .pgn-textarea::placeholder { color: #3a3028; }
        .pgn-textarea:focus { border-color: #c8a020; }

        .pgn-error {
          color: #ef4444;
          font-size: 12px;
          font-family: 'Rajdhani', sans-serif;
          letter-spacing: 0.05em;
        }

        .btn-row {
          display: flex;
          gap: 12px;
        }

        .btn-primary {
          flex: 1;
          padding: 14px 24px;
          background: #c8a020;
          border: none;
          border-radius: 3px;
          color: #0d0b08;
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary:hover { background: #d4ac28; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(200,160,32,0.2); }

        .btn-secondary {
          padding: 14px 24px;
          background: transparent;
          border: 1px solid #2a2018;
          border-radius: 3px;
          color: #8b7355;
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .btn-secondary:hover { border-color: #8b7355; color: #c8b896; }

        /* Features */
        .features {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: #1a1510;
          border-top: 1px solid #1a1510;
          margin-top: 80px;
          position: relative;
          z-index: 10;
        }

        .feature {
          background: #0d0b08;
          padding: 40px 36px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .feature-icon {
          font-size: 28px;
          line-height: 1;
          margin-bottom: 4px;
        }

        .feature-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #c8a97e;
        }

        .feature-desc {
          font-family: 'Cormorant Garamond', serif;
          font-size: 16px;
          color: #6b5a40;
          line-height: 1.6;
        }

        /* Sample games */
        .sample-section {
          padding: 0 24px 48px;
          position: relative;
          z-index: 10;
          max-width: 640px;
          margin: 0 auto;
          width: 100%;
        }

        .sample-label {
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #4a4030;
          margin-bottom: 12px;
        }

        .sample-games {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .sample-chip {
          padding: 6px 14px;
          background: #12100d;
          border: 1px solid #2a2018;
          border-radius: 2px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px;
          color: #6b5a40;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .sample-chip:hover { border-color: #c8a020; color: #c8a97e; }
        .sample-chip-name { font-weight: 600; }
        .sample-chip-year { color: #3a3028; }

        @media (max-width: 768px) {
          nav { padding: 16px 20px; }
          .nav-links { display: none; }
          .features { grid-template-columns: 1fr; }
          .hero-title { font-size: 48px; }
        }
      `}</style>

      <div className="page">
        <div className="bg-pattern" />
        <div className="bg-glow" />

        <nav>
          <div className="nav-logo">
            <span className="nav-logo-icon">♜</span>
            Rook
          </div>
          <div className="nav-links">
            <button className="nav-link">About</button>
            <button className="nav-link">Openings</button>
            <button className="nav-link">History</button>
            <button className="nav-cta" onClick={() => router.push("/analyze")}>
              Analyze
            </button>
          </div>
        </nav>

        <section className="hero">
          <div className="hero-eyebrow">Chess Analysis Engine</div>

          <h1 className="hero-title">
            See the <span className="hero-title-accent">truth</span><br />
            in every position
          </h1>

          <p className="hero-subtitle">
            Engine-powered analysis. AI explanations. Explore games move by move with depth.
          </p>

          <div className="input-group">
            <textarea
              className="pgn-textarea"
              placeholder="Paste PGN or FEN here — or start a new analysis"
              value={pgn}
              onChange={(e) => { setPgn(e.target.value); setPgnError(""); }}
              spellCheck={false}
            />
            {pgnError && <div className="pgn-error">{pgnError}</div>}
            <div className="btn-row">
              <button className="btn-primary" onClick={handleAnalyze}>
                {pgn.trim() ? "Analyze Game" : "Open Board"}
              </button>
              <button className="btn-secondary" onClick={() => router.push("/analyze")}>
                Start Position
              </button>
            </div>
          </div>

          <div style={{ marginTop: 40, width: "100%", maxWidth: 600 }}>
            <div className="sample-label">Classic games</div>
            <div className="sample-games">
              {SAMPLE_GAMES.map((g) => (
                <button
                  key={g.name}
                  className="sample-chip"
                  onClick={() => router.push(`/analyze?game=${encodeURIComponent(g.name)}`)}
                >
                  <span className="sample-chip-name">{g.name}</span>
                  <span className="sample-chip-year">{g.year}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="features">
          <div className="feature">
            <div className="feature-icon">⚡</div>
            <div className="feature-title">Engine Analysis</div>
            <div className="feature-desc">Stockfish-powered evaluation with multi-line principal variation and move annotations.</div>
          </div>
          <div className="feature">
            <div className="feature-icon">◎</div>
            <div className="feature-title">AI Chat</div>
            <div className="feature-desc">Ask questions about any position in plain language. Understand strategy, not just numbers.</div>
          </div>
          <div className="feature">
            <div className="feature-icon">♟</div>
            <div className="feature-title">PGN Import</div>
            <div className="feature-desc">Load any game via PGN or FEN. Navigate move by move with instant re-evaluation.</div>
          </div>
        </div>
      </div>
    </main>
  );
}