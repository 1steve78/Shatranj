"use client";
import { useEffect, Suspense, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import ChessBoard from "@/components/ChessBoard";
import EvalBar from "@/components/EvalBar";
import MoveList from "@/components/MoveList";
import ChatBox from "@/components/ChatBox";
import AccuracyGauge from "@/components/AccuracyGauge";
import MoveTimeline from "@/components/MoveTimeline";
import { getMoveClassification } from "@/lib/analysisLogic";
import { useAnalysis } from "@/hooks/useAnalysis";

function AnalyzePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    fen, evaluation, mate, bestMove, bestMoveArrows, depth, moves, currentMoveIndex, opening,
    currentMoveInsight, gameAnalysisProgress, chatMessages, isChatLoading, isAnalyzing, isGameAnalyzing, isImporting, error,
    analyze, goToMove, goBack, goForward, importPgn, sendMessage, clearError,
    analysisByMoveIndex, parsedGame
  } = useAnalysis();

  const [flipped, setFlipped] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy FEN");
  const [activePanel, setActivePanel] = useState<"moves" | "chat">("moves");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { whiteAccuracy, blackAccuracy } = React.useMemo(() => {
    if (!parsedGame) return { whiteAccuracy: 0, blackAccuracy: 0 };
    const wAccs: number[] = [];
    const bAccs: number[] = [];
    for (let i = 1; i <= parsedGame.moves.length; i++) {
        const isWhite = i % 2 !== 0;
        const prev = analysisByMoveIndex[i - 1];
        const curr = analysisByMoveIndex[i];
        if (prev && curr) {
            const { type, accuracy } = getMoveClassification(prev, curr, isWhite);
            if (type !== "pending") {
                if (isWhite) wAccs.push(accuracy);
                else bAccs.push(accuracy);
            }
        }
    }
    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    return { whiteAccuracy: avg(wAccs), blackAccuracy: avg(bAccs) };
  }, [parsedGame, analysisByMoveIndex]);

  useEffect(() => {
    const pgn = searchParams.get("pgn");
    if (pgn) {
      importPgn(decodeURIComponent(pgn));
    } else {
      analyze(fen); // let the hook use its own internal FEN state
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowLeft") goBack();
      if (e.key === "ArrowRight") goForward();
      if (e.key === "f" || e.key === "F") setFlipped(f => !f);
      if (e.key === "Home") goToMove(0);
      if (e.key === "End") goToMove(moves.length * 2);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goBack, goForward, goToMove, moves.length]);

  const handleImportSubmit = () => {
    const text = importText.trim();
    if (!text) { setImportError("Paste a PGN or FEN first."); return; }

    // FEN: contains slashes and a side-to-move character (w/b)
    const looksLikeFen = /^[rnbqkpRNBQKP1-8\/]+ [wb]/.test(text);
    // PGN: contains move numbers like "1." or headers like "[Event"
    const looksLikePgn = text.includes("1.") || text.startsWith("[");

    if (!looksLikeFen && !looksLikePgn) {
      setImportError("Doesn't look like valid PGN or FEN.");
      return;
    }
    importPgn(text);
    setShowImportModal(false);
    setImportText("");
    setImportError("");
  };

  const handleFileRead = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setImportText(text.trim());
      setImportError("");
    };
    reader.readAsText(file);
  };

  const copyFen = () => {
    navigator.clipboard.writeText(fen).then(() => {
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy FEN"), 1800);
    });
  };

  const evalText = mate !== null
    ? (mate > 0 ? `M${Math.abs(mate)}` : `-M${Math.abs(mate)}`)
    : evaluation > 0
      ? `+${evaluation.toFixed(2)}`
      : evaluation.toFixed(2);

  const evalColor = mate !== null
    ? (mate > 0 ? "#f5e6c8" : "#8b7355")
    : evaluation > 0.3
      ? "#f5e6c8"
      : evaluation < -0.3
        ? "#6b5a40"
        : "#c8b896";

  const evalSuffix = mate !== null
    ? (mate > 0 ? "White mates" : "Black mates")
    : Math.abs(evaluation) < 0.2
      ? "Equal"
      : evaluation > 0
        ? "White better"
        : "Black better";

  const isWritingCoachNotes = isGameAnalyzing
    && gameAnalysisProgress.total > 0
    && gameAnalysisProgress.completed >= gameAnalysisProgress.total;

  const boardLoadingLabel = isWritingCoachNotes
    ? "Writing coach notes"
    : gameAnalysisProgress.total > 1
    ? `Analyzing ${gameAnalysisProgress.completed}/${gameAnalysisProgress.total} positions`
    : "Analyzing position";

  const coachNoteText = isGameAnalyzing
    ? boardLoadingLabel
    : currentMoveInsight;

  return (
    <div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0d0b08;
          color: #c8b896;
          font-family: 'Rajdhani', sans-serif;
          height: 100vh;
          overflow: hidden;
        }

        .analyze-layout {
          display: grid;
          grid-template-rows: 48px 1fr;
          height: 100vh;
          background: #0d0b08;
        }

        /* ─── Topbar ─── */
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          border-bottom: 1px solid #1a1510;
          background: #09070500;
          gap: 16px;
          z-index: 50;
        }

        .topbar-logo {
          font-family: 'Cormorant Garamond', serif;
          font-size: 17px;
          font-weight: 600;
          color: #f5e6c8;
          display: flex;
          align-items: center;
          gap: 7px;
          cursor: pointer;
          flex-shrink: 0;
          letter-spacing: 0.01em;
          padding: 0 4px;
        }
        .topbar-logo:hover { color: #c8a97e; }

        .topbar-center {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
          justify-content: center;
          overflow: hidden;
        }

        .opening-badge {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #6b5a40;
          letter-spacing: 0.04em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 240px;
        }
        .opening-eco {
          color: #c8a020;
          margin-right: 6px;
        }

        .topbar-divider {
          width: 1px;
          height: 16px;
          background: #2a2018;
          flex-shrink: 0;
        }

        .eval-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 10px;
          background: #12100d;
          border: 1px solid #1e1a14;
          border-radius: 3px;
          flex-shrink: 0;
        }

        .analyzing-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #c8a020;
          animation: pulse 1s ease infinite;
          flex-shrink: 0;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        .eval-score {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.04em;
          line-height: 1;
          min-width: 44px;
        }

        .eval-suffix {
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #4a4030;
        }

        .depth-badge {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #3a3028;
        }

        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .icon-btn {
          height: 30px;
          padding: 0 10px;
          background: transparent;
          border: 1px solid #2a2018;
          border-radius: 3px;
          color: #6b5a40;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s;
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .icon-btn:hover { border-color: #6b5a40; color: #c8b896; }
        .icon-btn.active { border-color: #c8a020; color: #c8a020; }

        .import-btn {
          height: 30px;
          padding: 0 14px;
          background: transparent;
          border: 1px solid #c8a020;
          border-radius: 3px;
          color: #c8a020;
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .import-btn:hover { background: #c8a020; color: #0d0b08; }

        /* ─── Content area ─── */
        .content-area {
          display: grid;
          grid-template-columns: 40px 1fr 280px;
          overflow: hidden;
        }

        .left-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px 8px;
          border-right: 1px solid #1a1510;
          background: #0a0805;
        }

        .center-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          overflow: hidden;
          gap: 12px;
        }

        /* Player labels above/below board */
        .player-label {
          width: 100%;
          max-width: 512px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2px;
        }
        .player-name {
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.06em;
          color: #8b7355;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .player-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          border: 1px solid #3a3028;
          flex-shrink: 0;
        }
        .player-dot.white { background: #e8dcc8; border-color: #a08860; }
        .player-dot.black { background: #1e1a14; border-color: #3a3028; }
        .player-clock {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          color: #4a4030;
        }

        .coach-note-card {
          width: 100%;
          max-width: 512px;
          min-height: 44px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: #100e0b;
          border: 1px solid #2a2018;
          border-left: 2px solid #c8a020;
          border-radius: 3px;
          color: #c8b896;
        }

        .coach-note-icon {
          width: 22px;
          height: 22px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 50%;
          background: rgba(200, 160, 32, 0.12);
          color: #c8a020;
          font-size: 14px;
        }

        .coach-note-text {
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.04em;
          line-height: 1.25;
        }

        .coach-note-card.loading .coach-note-text {
          color: #8b7355;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.12em;
        }

        .board-wrap {
          position: relative;
          width: min(64vh, 100%, 512px);
          aspect-ratio: 1 / 1;
          flex-shrink: 0;
        }

        .chess-board-wrap,
        .board-container {
          width: 100%;
          height: 100%;
          aspect-ratio: 1 / 1;
        }

        /* Best move bar — above controls */
        .best-move-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 14px;
          background: #0f0d0a;
          border: 1px solid #1e1a14;
          border-radius: 3px;
          width: 100%;
          max-width: 512px;
        }
        .best-move-label {
          font-family: 'Rajdhani', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #3a3028;
        }
        .best-move-san {
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          font-weight: 500;
          color: #c8a020;
          letter-spacing: 0.04em;
          flex: 1;
        }
        .best-move-copy {
          font-family: 'Rajdhani', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #3a3028;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          transition: color 0.15s;
        }
        .best-move-copy:hover { color: #c8a020; }

        /* Nav controls */
        .board-controls {
          display: flex;
          align-items: center;
          gap: 4px;
          width: 100%;
          max-width: 512px;
        }

        .ctrl-btn {
          flex: 1;
          height: 34px;
          background: #0f0d0a;
          border: 1px solid #1e1a14;
          border-radius: 3px;
          color: #6b5a40;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .ctrl-btn:hover { border-color: #c8a020; color: #c8a020; }
        .ctrl-btn:active { background: #1a1510; transform: scale(0.97); }

        /* Keyboard hint */
        .kbd-hint {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #2a2018;
          letter-spacing: 0.05em;
          text-align: center;
        }

        /* ─── Right panel ─── */
        .right-panel {
          display: flex;
          flex-direction: column;
          border-left: 1px solid #1a1510;
          background: #0a0805;
          overflow: hidden;
        }

        /* Panel tab switcher */
        .panel-tabs {
          display: flex;
          border-bottom: 1px solid #1a1510;
          flex-shrink: 0;
        }
        .panel-tab {
          flex: 1;
          padding: 10px 0;
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #3a3028;
          border-bottom: 2px solid transparent;
          transition: all 0.15s;
          position: relative;
          bottom: -1px;
        }
        .panel-tab:hover { color: #8b7355; }
        .panel-tab.active { color: #c8a97e; border-bottom-color: #c8a020; }

        .panel-content {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        /* FEN display at bottom of right panel */
        .fen-strip {
          border-top: 1px solid #1a1510;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
          background: #09070500;
        }
        .fen-text {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          color: #3a3028;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
          letter-spacing: 0.03em;
        }
        .fen-copy-btn {
          font-family: 'Rajdhani', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #4a4030;
          background: none;
          border: none;
          cursor: pointer;
          padding: 2px 6px;
          white-space: nowrap;
          transition: color 0.15s;
          flex-shrink: 0;
        }
        .fen-copy-btn:hover { color: #c8a020; }

        /* ─── Import modal overlay ─── */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .modal {
          background: #12100d;
          border: 1px solid #2a2018;
          border-radius: 4px;
          width: 100%;
          max-width: 520px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .modal-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #c8a97e;
        }
        .modal-close {
          width: 28px; height: 28px;
          background: none;
          border: 1px solid #2a2018;
          border-radius: 2px;
          color: #6b5a40;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          transition: all 0.15s;
        }
        .modal-close:hover { border-color: #6b5a40; color: #c8b896; }
        .modal-textarea {
          width: 100%;
          background: #0d0b08;
          border: 1px solid #2a2018;
          border-radius: 3px;
          padding: 12px;
          color: #c8b896;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          resize: vertical;
          min-height: 120px;
          outline: none;
          transition: border-color 0.2s;
          line-height: 1.5;
        }
        .modal-textarea:focus { border-color: #c8a020; }
        .modal-textarea::placeholder { color: #3a3028; }
        .modal-error {
          color: #ef4444;
          font-size: 12px;
          font-family: 'Rajdhani', sans-serif;
          letter-spacing: 0.05em;
        }
        .modal-actions {
          display: flex;
          gap: 8px;
        }
        .modal-btn-primary {
          flex: 1;
          padding: 11px 20px;
          background: #c8a020;
          border: none;
          border-radius: 3px;
          color: #0d0b08;
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.15s;
        }
        .modal-btn-primary:hover { background: #d4ac28; }
        .modal-btn-secondary {
          padding: 11px 20px;
          background: transparent;
          border: 1px solid #2a2018;
          border-radius: 3px;
          color: #6b5a40;
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .modal-btn-secondary:hover { border-color: #6b5a40; color: #c8b896; }
        .modal-drop-hint {
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          color: #3a3028;
          letter-spacing: 0.08em;
          text-align: center;
        }

        /* ─── Error toast ─── */
        .error-toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #1a0808;
          border: 1px solid rgba(239,68,68,0.4);
          border-radius: 4px;
          padding: 9px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 300;
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          color: #ef4444;
          white-space: nowrap;
        }
        .error-close {
          background: none;
          border: none;
          color: #ef4444;
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
          opacity: 0.6;
          padding: 0;
          transition: opacity 0.15s;
        }
        .error-close:hover { opacity: 1; }

        /* ─── Responsive ─── */
        @media (max-width: 1024px) {
          .content-area { grid-template-columns: 40px 1fr 240px; }
        }
        @media (max-width: 860px) {
          .content-area { grid-template-columns: 40px 1fr; }
          .right-panel { display: none; }
        }
        @media (max-width: 580px) {
          .left-panel { display: none; }
          .content-area { grid-template-columns: 1fr; }
          .center-panel { padding: 12px; }
          .topbar { padding: 0 12px; }
          .opening-badge { display: none; }
        }
      `}</style>

      <div className="analyze-layout">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-logo" onClick={() => router.push("/")}>
            ♜ Rook
          </div>

          <div className="topbar-center">
            {opening && (
              <>
                <div className="opening-badge">
                  <span className="opening-eco">{opening.eco}</span>
                  {opening.name}
                </div>
                <div className="topbar-divider" />
              </>
            )}
            <div className="eval-pill">
              {isAnalyzing && <div className="analyzing-dot" />}
              <span className="eval-score" style={{ color: evalColor }}>{evalText}</span>
              <span className="eval-suffix">{evalSuffix}</span>
              {isGameAnalyzing && gameAnalysisProgress.total > 0 && (
                <span className="depth-badge">
                  {gameAnalysisProgress.completed}/{gameAnalysisProgress.total}
                </span>
              )}
              {depth > 0 && <span className="depth-badge">d{depth}</span>}
            </div>
          </div>

          <div className="topbar-actions">
            <button
              className={`icon-btn${flipped ? " active" : ""}`}
              onClick={() => setFlipped(f => !f)}
              title="Flip board (F)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              Flip
            </button>
            <button className="import-btn" onClick={() => setShowImportModal(true)}>
              Import PGN
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="content-area">
          {/* Eval bar */}
          <div className="left-panel">
            <EvalBar evaluation={evaluation} mate={mate} isVertical />
          </div>

          {/* Board + controls */}
          <div className="center-panel">
            {coachNoteText && (
              <div className={`coach-note-card${isGameAnalyzing ? " loading" : ""}`}>
                <span className="coach-note-icon" aria-hidden="true">{"\u2658"}</span>
                <span className="coach-note-text">{coachNoteText}</span>
              </div>
            )}

            <div className="player-label">
              <div className="player-name">
                <span className={`player-dot ${flipped ? "white" : "black"}`} />
                {flipped ? "White" : "Black"}
              </div>
            </div>

            <div className="board-wrap">
              <ChessBoard
                fen={fen}
                bestMoveArrows={bestMoveArrows}
                flipped={flipped}
                isLoading={isGameAnalyzing}
                loadingLabel={boardLoadingLabel}
              // lastMove={
              //   currentMoveIndex >= 0 && moves[currentMoveIndex]
              //     ? { from: moves[currentMoveIndex].from, to: moves[currentMoveIndex].to }
              //     : undefined
              // }
              />
            </div>

            <div className="player-label">
              <div className="player-name">
                <span className={`player-dot ${flipped ? "black" : "white"}`} />
                {flipped ? "Black" : "White"}
              </div>
            </div>

            {bestMove && (
              <div className="best-move-bar">
                <span className="best-move-label">Best</span>
                <span className="best-move-san">{bestMove}</span>
                <button
                  className="best-move-copy"
                  onClick={() => navigator.clipboard.writeText(bestMove)}
                >
                  Copy
                </button>
              </div>
            )}

            <div className="board-controls">
              <button className="ctrl-btn" onClick={() => goToMove(0)} title="Start (Home)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" />
                </svg>
              </button>
              <button className="ctrl-btn" onClick={goBack} title="Previous (←)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button className="ctrl-btn" onClick={goForward} title="Next (→)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <button className="ctrl-btn" onClick={() => goToMove(moves.length * 2)} title="End">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />
                </svg>
              </button>
            </div>

            <div className="kbd-hint">← → to navigate · F to flip</div>
          </div>

          {/* Right panel */}
          <div className="right-panel" style={{ overflowY: "auto" }}>
            {parsedGame && parsedGame.moves.length > 0 && (
              <div style={{ padding: "16px 0", borderBottom: "1px solid #1a1510", background: "#0a0805" }}>
                <AccuracyGauge whiteAccuracy={whiteAccuracy} blackAccuracy={blackAccuracy} />
              </div>
            )}
            <div className="panel-tabs">
              <button
                className={`panel-tab${activePanel === "moves" ? " active" : ""}`}
                onClick={() => setActivePanel("moves")}
              >
                Moves
              </button>
              <button
                className={`panel-tab${activePanel === "chat" ? " active" : ""}`}
                onClick={() => setActivePanel("chat")}
              >
                Ask AI
              </button>
            </div>
            <div className="panel-content">
              {activePanel === "moves" ? (
                <MoveList
                  moves={moves}
                  currentMoveIndex={currentMoveIndex}
                  onMoveClick={goToMove}
                />
              ) : (
                <ChatBox
                  messages={chatMessages}
                  onSendMessage={sendMessage}
                  isLoading={isChatLoading}
                  placeholder="Ask about this position…"
                />
              )}
            </div>
            
            {parsedGame && parsedGame.moves.length > 0 && (
                <MoveTimeline 
                    totalMoves={parsedGame.moves.length}
                    analysisByMoveIndex={analysisByMoveIndex}
                    currentMoveIndex={currentMoveIndex}
                    onMoveClick={goToMove}
                />
            )}

            <div className="fen-strip">
              <span className="fen-text">{fen}</span>
              <button className="fen-copy-btn" onClick={copyFen}>{copyLabel}</button>
            </div>
          </div>
        </div>
      </div>

      {/* Import modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowImportModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Import PGN / FEN</span>
              <button className="modal-close" onClick={() => setShowImportModal(false)}>✕</button>
            </div>
            <textarea
              className="modal-textarea"
              placeholder="Paste PGN or FEN here…"
              value={importText}
              onChange={(e) => { setImportText(e.target.value); setImportError(""); }}
              autoFocus
              spellCheck={false}
            />
            {importError && <div className="modal-error">{importError}</div>}
            <div className="modal-actions">
              <button className="modal-btn-primary" onClick={handleImportSubmit} disabled={isImporting}>
                {isImporting ? "Loading..." : "Load Game"}
              </button>
              <button
                className="modal-btn-secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload .pgn
              </button>
            </div>
            <div className="modal-drop-hint">or drag and drop a .pgn file onto this window</div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pgn,.txt"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileRead(f); }}
            />
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="error-toast">
          <span>{error}</span>
          <button className="error-close" onClick={clearError}>✕</button>
        </div>
      )}
    </div>
  );
}

export default function AnalyzePageWrapper() {
  return (
    <Suspense>
      <AnalyzePage />
    </Suspense>
  );
}
