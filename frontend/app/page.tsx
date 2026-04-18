"use client";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";

export default function HomePage() {
  const router = useRouter();
  const [pgn, setPgn] = useState("");
  const [pgnError, setPgnError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = () => {
    if (!pgn.trim()) {
      router.push("/analyze");
      return;
    }
    if (!pgn.includes("1.") && !pgn.match(/[a-h][1-8]/)) {
      setPgnError("Doesn't look like valid PGN. Try pasting a full game.");
      return;
    }
    const encoded = encodeURIComponent(pgn.trim());
    router.push(`/analyze?pgn=${encoded}`);
  };

  const handleFileRead = (file: File) => {
    if (!file.name.endsWith(".pgn") && file.type !== "text/plain") {
      setPgnError("Please upload a .pgn file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setPgn(text.trim());
      setPgnError("");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileRead(file);
  };

  const SAMPLE_GAMES = [
    { name: "Immortal Game", year: "1851", white: "Anderssen", black: "Kieseritzky", eco: "C33" },
    { name: "Opera Game", year: "1858", white: "Morphy", black: "Allies", eco: "C41" },
    { name: "Game of the Century", year: "1956", white: "Byrne", black: "Fischer", eco: "D97" },
    { name: "Evergreen Game", year: "1852", white: "Anderssen", black: "Dufresne", eco: "C52" },
    { name: "Deep Blue vs Kasparov", year: "1997", white: "Deep Blue", black: "Kasparov", eco: "B07" },
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

        .page::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 100;
        }

        .bg-pattern {
          position: fixed;
          inset: 0;
          opacity: 0.025;
          background-image: repeating-conic-gradient(#c8a97e 0% 25%, transparent 0% 50%);
          background-size: 80px 80px;
        }

        /* Softer, more editorial top glow */
        .bg-glow {
          position: fixed;
          top: -10%;
          left: 50%;
          transform: translateX(-50%);
          width: 1000px;
          height: 500px;
          background: radial-gradient(ellipse, rgba(200,160,32,0.05) 0%, transparent 65%);
          pointer-events: none;
        }

        /* ─── Nav ─── */
        nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 48px;
          border-bottom: 1px solid #1a1510;
          position: relative;
          z-index: 10;
        }

        .nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-weight: 600;
          color: #f5e6c8;
          letter-spacing: 0.02em;
          text-decoration: none;
        }
        .nav-logo-icon { font-size: 26px; line-height: 1; }

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

        /* ─── Hero ─── */
        .hero {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 72px 24px 48px;
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
          width: 40px;
          height: 1px;
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
        .hero-title-accent { font-style: italic; color: #c8a020; }

        .hero-subtitle {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          font-weight: 300;
          font-style: italic;
          color: #8b7355;
          margin: 20px 0 48px;
          max-width: 480px;
          line-height: 1.5;
        }

        /* ─── Input area ─── */
        .input-group {
          width: 100%;
          max-width: 600px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* Drop zone wrapper */
        .pgn-dropzone {
          position: relative;
          border-radius: 4px;
          transition: border-color 0.2s;
        }
        .pgn-dropzone.dragging { border-color: #c8a020; }

        .pgn-textarea {
          width: 100%;
          background: #12100d;
          border: 1px solid #2a2018;
          border-radius: 4px;
          padding: 14px 16px 32px;
          color: #c8b896;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          resize: vertical;
          min-height: 80px;
          max-height: 200px;
          outline: none;
          transition: border-color 0.2s;
          line-height: 1.6;
          width: 100%;
        }
        .pgn-textarea::placeholder { color: #3a3028; }
        .pgn-textarea:focus { border-color: #c8a020; }
        .pgn-dropzone.dragging .pgn-textarea {
          border-color: #c8a020;
          background: #15110a;
        }

        /* Hint row inside textarea bottom */
        .pgn-hints {
          position: absolute;
          bottom: 8px;
          right: 10px;
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .pgn-hint-btn {
          font-family: 'Rajdhani', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #4a4030;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          transition: color 0.15s;
        }
        .pgn-hint-btn:hover { color: #c8a020; }

        .pgn-divider { width: 1px; height: 10px; background: #2a2018; }

        .pgn-char-count {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #2a2018;
        }
        .pgn-char-count.has-content { color: #4a4030; }

        .pgn-error {
          color: #ef4444;
          font-size: 12px;
          font-family: 'Rajdhani', sans-serif;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .pgn-error::before {
          content: '';
          display: inline-block;
          width: 4px; height: 4px;
          background: #ef4444;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .btn-row {
          display: flex;
          gap: 8px;
        }

        .btn-primary {
          flex: 1;
          padding: 13px 24px;
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
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .btn-primary:hover { background: #d4ac28; transform: translateY(-1px); }
        .btn-primary:active { transform: translateY(0); }

        .btn-secondary {
          padding: 13px 20px;
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

        .btn-icon {
          width: 44px;
          padding: 13px 0;
          background: transparent;
          border: 1px solid #2a2018;
          border-radius: 3px;
          color: #6b5a40;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .btn-icon:hover { border-color: #8b7355; color: #c8b896; }

        /* ─── Sample games ─── */
        .sample-section {
          margin-top: 36px;
          width: 100%;
          max-width: 600px;
        }

        .sample-label {
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #3a3028;
          margin-bottom: 10px;
        }

        .sample-games {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .sample-chip {
          padding: 5px 12px;
          background: #0f0d0a;
          border: 1px solid #1e1a14;
          border-radius: 2px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px;
          color: #5a4d36;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .sample-chip:hover { border-color: #4a3e28; color: #c8a97e; background: #13100c; }
        .sample-chip-eco {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #3a3028;
          letter-spacing: 0.05em;
        }
        .sample-chip:hover .sample-chip-eco { color: #6b5a40; }
        .sample-chip-name { font-weight: 600; letter-spacing: 0.04em; }
        .sample-chip-year { color: #3a3028; font-size: 11px; }

        /* ─── Features ─── */
        .features {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: #161210;
          border-top: 1px solid #1a1510;
          margin-top: 72px;
          position: relative;
          z-index: 10;
        }

        .feature {
          background: #0d0b08;
          padding: 36px 32px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: background 0.2s;
        }
        .feature:hover { background: #100e0b; }

        .feature-icon-wrap {
          width: 36px;
          height: 36px;
          border: 1px solid #1e1a14;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 6px;
          color: #c8a020;
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
          color: #5a4d36;
          line-height: 1.65;
        }

        /* ─── Stats strip ─── */
        .stats-strip {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: #161210;
          border-top: 1px solid #1a1510;
          position: relative;
          z-index: 10;
        }
        .stat {
          background: #0a0805;
          padding: 24px 32px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .stat-number {
          font-family: 'Cormorant Garamond', serif;
          font-size: 32px;
          font-weight: 300;
          color: #f5e6c8;
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .stat-number span { color: #c8a020; font-style: italic; }
        .stat-label {
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #3a3028;
        }

        @media (max-width: 768px) {
          nav { padding: 16px 20px; }
          .nav-links { display: none; }
          .features, .stats-strip { grid-template-columns: 1fr; }
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
            Engine-powered analysis. AI explanations.<br />
            Explore games move by move with depth.
          </p>

          <div className="input-group">
            <div
              className={`pgn-dropzone${isDragging ? " dragging" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <textarea
                className="pgn-textarea"
                placeholder={isDragging ? "Drop .pgn file here…" : "Paste PGN or FEN — or drag and drop a .pgn file"}
                value={pgn}
                onChange={(e) => { setPgn(e.target.value); setPgnError(""); }}
                spellCheck={false}
              />
              <div className="pgn-hints">
                {pgn.trim() && (
                  <>
                    <button className="pgn-hint-btn" onClick={() => { setPgn(""); setPgnError(""); }}>
                      Clear
                    </button>
                    <div className="pgn-divider" />
                  </>
                )}
                <button className="pgn-hint-btn" onClick={() => fileInputRef.current?.click()}>
                  Upload
                </button>
                <div className="pgn-divider" />
                <span className={`pgn-char-count${pgn.trim() ? " has-content" : ""}`}>
                  {pgn.length}
                </span>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pgn,.txt"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileRead(f); }}
            />

            {pgnError && <div className="pgn-error">{pgnError}</div>}

            <div className="btn-row">
              <button className="btn-primary" onClick={handleAnalyze}>
                {pgn.trim() ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    Analyze Game
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
                    </svg>
                    Open Board
                  </>
                )}
              </button>
              <button className="btn-secondary" onClick={() => router.push("/analyze")}>
                Start Position
              </button>
              <button
                className="btn-icon"
                title="Upload PGN file"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </button>
            </div>
          </div>

          <div className="sample-section">
            <div className="sample-label">Classic games</div>
            <div className="sample-games">
              {SAMPLE_GAMES.map((g) => (
                <button
                  key={g.name}
                  className="sample-chip"
                  onClick={() => router.push(`/analyze?game=${encodeURIComponent(g.name)}`)}
                  title={`${g.white} vs ${g.black}`}
                >
                  <span className="sample-chip-eco">{g.eco}</span>
                  <span className="sample-chip-name">{g.name}</span>
                  <span className="sample-chip-year">{g.year}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <div className="stats-strip">
          <div className="stat">
            <div className="stat-number">∞<span>+</span></div>
            <div className="stat-label">Positions analysed</div>
          </div>
          <div className="stat">
            <div className="stat-number">40<span>+</span></div>
            <div className="stat-label">Depth by default</div>
          </div>
          <div className="stat">
            <div className="stat-number">3<span>k</span></div>
            <div className="stat-label">Opening lines in library</div>
          </div>
        </div>

        {/* Features */}
        <div className="features">
          <div className="feature">
            <div className="feature-icon-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div className="feature-title">Engine Analysis</div>
            <div className="feature-desc">
              Stockfish-powered evaluation with multi-line principal variation and annotated move classifications.
            </div>
          </div>
          <div className="feature">
            <div className="feature-icon-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="feature-title">AI Chat</div>
            <div className="feature-desc">
              Ask questions about any position in plain language. Understand strategy and plans, not just numbers.
            </div>
          </div>
          <div className="feature">
            <div className="feature-icon-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="8 6 2 12 8 18" /><polyline points="16 6 22 12 16 18" />
              </svg>
            </div>
            <div className="feature-title">PGN Import</div>
            <div className="feature-desc">
              Load any game via PGN, FEN, or file upload. Navigate move by move with instant position re-evaluation.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}