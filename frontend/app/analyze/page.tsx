"use client";
import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import ChessBoard from "@/components/ChessBoard";
import EvalBar from "@/components/EvalBar";
import MoveList from "@/components/MoveList";
import ChatBox from "@/components/ChatBox";
import { useAnalysis } from "@/hooks/useAnalysis";

function AnalyzePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const {
        fen, evaluation, mate, bestMove, depth, moves, currentMoveIndex, opening,
        chatMessages, isChatLoading, isAnalyzing, isImporting, error,
        analyze, goToMove, goBack, goForward, importPgn, sendMessage, clearError,
    } = useAnalysis();

    useEffect(() => {
        const pgn = searchParams.get("pgn");
        if (pgn) {
            importPgn(decodeURIComponent(pgn));
        } else {
            analyze(fen);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keyboard navigation
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") goBack();
            if (e.key === "ArrowRight") goForward();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [goBack, goForward]);

    const evalText = mate !== null
        ? (mate > 0 ? `White mates in ${Math.abs(mate)}` : `Black mates in ${Math.abs(mate)}`)
        : evaluation > 0
            ? `+${evaluation.toFixed(2)} White`
            : evaluation < 0
                ? `${evaluation.toFixed(2)} Black`
                : "Equal";

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
          grid-template-rows: 52px 1fr;
          height: 100vh;
          background: #0d0b08;
        }

        /* Top bar */
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          border-bottom: 1px solid #1a1510;
          background: #0a0805;
          gap: 16px;
          z-index: 50;
        }

        .topbar-logo {
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px;
          font-weight: 600;
          color: #f5e6c8;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          flex-shrink: 0;
        }

        .topbar-center {
          display: flex;
          align-items: center;
          gap: 20px;
          flex: 1;
          justify-content: center;
        }

        .opening-badge {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #8b7355;
          letter-spacing: 0.05em;
        }

        .eval-inline {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 500;
          color: #c8a020;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .depth-badge {
          font-size: 10px;
          color: #4a4030;
          font-weight: 400;
        }

        .analyzing-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #c8a020;
          animation: spin-pulse 1s ease infinite;
        }
        @keyframes spin-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .icon-btn {
          width: 32px; height: 32px;
          background: transparent;
          border: 1px solid #2a2018;
          border-radius: 3px;
          color: #6b5a40;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          font-size: 14px;
        }
        .icon-btn:hover { border-color: #8b7355; color: #c8b896; }

        .import-btn {
          padding: 6px 14px;
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
        }
        .import-btn:hover { background: #c8a020; color: #0d0b08; }

        /* Main content area */
        .content-area {
          display: grid;
          grid-template-columns: auto 1fr auto;
          overflow: hidden;
        }

        /* Left panel: EvalBar */
        .left-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px 12px;
          border-right: 1px solid #1a1510;
          background: #0a0805;
        }

        /* Center panel: board + controls */
        .center-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0;
          padding: 24px;
          overflow: hidden;
        }

        .board-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        /* Nav controls below board */
        .board-controls {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .ctrl-btn {
          width: 36px; height: 36px;
          background: #12100d;
          border: 1px solid #2a2018;
          border-radius: 3px;
          color: #8b7355;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .ctrl-btn:hover { border-color: #c8a020; color: #c8a020; }
        .ctrl-btn:active { background: #1e1a14; }

        .best-move-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          background: #0f0d0a;
          border: 1px solid #1e1a14;
          border-radius: 3px;
        }

        .best-move-label {
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #4a4030;
        }

        .best-move-san {
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          font-weight: 500;
          color: #c8a020;
          letter-spacing: 0.05em;
        }

        /* Right panel: move list + chat */
        .right-panel {
          display: grid;
          grid-template-rows: 1fr 1fr;
          border-left: 1px solid #1a1510;
          width: 300px;
          background: #0a0805;
          overflow: hidden;
        }

        .right-section {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-bottom: 1px solid #1a1510;
        }
        .right-section:last-child { border-bottom: none; }

        /* Error toast */
        .error-toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: #1e0a0a;
          border: 1px solid #ef4444;
          border-radius: 4px;
          padding: 10px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 200;
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          color: #ef4444;
        }

        .error-close {
          background: none;
          border: none;
          color: #ef4444;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          padding: 0;
        }

        @media (max-width: 900px) {
          .content-area {
            grid-template-columns: auto 1fr;
          }
          .right-panel { display: none; }
        }

        @media (max-width: 640px) {
          .left-panel { display: none; }
          .center-panel { padding: 12px; }
        }
      `}</style>

            <div className="analyze-layout">
                {/* Top bar */}
                <div className="topbar">
                    <div className="topbar-logo" onClick={() => router.push("/")}>
                        ♜ Rook
                    </div>

                    <div className="topbar-center">
                        {opening && (
                            <div className="opening-badge">
                                {opening.eco} · {opening.name}
                            </div>
                        )}
                        <div className="eval-inline">
                            {isAnalyzing && <div className="analyzing-dot" />}
                            {evalText}
                            {depth > 0 && <span className="depth-badge">d{depth}</span>}
                        </div>
                    </div>

                    <div className="topbar-actions">
                        <button className="icon-btn" title="Flip board">⇅</button>
                        <button className="import-btn">Import PGN</button>
                    </div>
                </div>

                {/* Content */}
                <div className="content-area">
                    {/* Eval bar */}
                    <div className="left-panel">
                        <EvalBar evaluation={evaluation} mate={mate} isVertical />
                    </div>

                    {/* Board */}
                    <div className="center-panel">
                        <div className="board-wrap">
                            <ChessBoard fen={fen} />

                            {bestMove && (
                                <div className="best-move-bar">
                                    <span className="best-move-label">Best</span>
                                    <span className="best-move-san">{bestMove}</span>
                                </div>
                            )}

                            <div className="board-controls">
                                <button className="ctrl-btn" onClick={() => goToMove(0)} title="Start (Home)">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" />
                                    </svg>
                                </button>
                                <button className="ctrl-btn" onClick={goBack} title="Previous (←)">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="15 18 9 12 15 6" />
                                    </svg>
                                </button>
                                <button className="ctrl-btn" onClick={goForward} title="Next (→)">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </button>
                                <button className="ctrl-btn" title="End">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right panel */}
                    <div className="right-panel">
                        <div className="right-section">
                            <MoveList
                                moves={moves}
                                currentMoveIndex={currentMoveIndex}
                                onMoveClick={goToMove}
                            />
                        </div>
                        <div className="right-section">
                            <ChatBox
                                messages={chatMessages}
                                onSendMessage={sendMessage}
                                isLoading={isChatLoading}
                                placeholder="Ask about this position…"
                            />
                        </div>
                    </div>
                </div>
            </div>

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