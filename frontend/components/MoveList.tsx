import { useRef, useEffect } from "react";

export interface Move {
    moveNumber: number;
    white: string;
    black?: string;
    whiteEval?: number;
    blackEval?: number;
    whiteAnnotation?: "best" | "good" | "inaccuracy" | "mistake" | "blunder";
    blackAnnotation?: "best" | "good" | "inaccuracy" | "mistake" | "blunder";
}

interface MoveListProps {
    moves: Move[];
    currentMoveIndex?: number; // half-move index (0 = start, 1 = white's 1st, 2 = black's 1st, ...)
    onMoveClick?: (halfMoveIndex: number) => void;
}

const ANNOTATION_SYMBOLS: Record<string, string> = {
    best: "★",
    good: "!",
    inaccuracy: "?!",
    mistake: "?",
    blunder: "??",
};

const ANNOTATION_COLORS: Record<string, string> = {
    best: "#4ade80",
    good: "#86efac",
    inaccuracy: "#fbbf24",
    mistake: "#f97316",
    blunder: "#ef4444",
};

export default function MoveList({ moves, currentMoveIndex = 0, onMoveClick }: MoveListProps) {
    const activeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, [currentMoveIndex]);

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        .move-list-header {
          padding: 12px 16px;
          border-bottom: 1px solid #2a2018;
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #8b7355;
        }
        .move-list-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 8px 0;
          scrollbar-width: thin;
          scrollbar-color: #3a3028 transparent;
        }
        .move-list-scroll::-webkit-scrollbar { width: 4px; }
        .move-list-scroll::-webkit-scrollbar-track { background: transparent; }
        .move-list-scroll::-webkit-scrollbar-thumb { background: #3a3028; border-radius: 2px; }
        .move-row {
          display: grid;
          grid-template-columns: 36px 1fr 1fr;
          align-items: center;
          gap: 0;
          padding: 0 8px;
        }
        .move-row:hover { background: rgba(139,115,85,0.05); }
        .move-num {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #4a4030;
          font-weight: 400;
          padding: 4px 0;
          user-select: none;
        }
        .move-cell {
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          font-weight: 500;
          padding: 4px 8px;
          border-radius: 3px;
          cursor: pointer;
          color: #c8b896;
          transition: all 0.12s;
          display: flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
        }
        .move-cell:hover { color: #f5e6c8; background: rgba(139,115,85,0.12); }
        .move-cell.active {
          background: #c8a020;
          color: #0d0b08;
          font-weight: 700;
        }
        .move-cell.active:hover { background: #d4a820; }
        .annotation {
          font-size: 12px;
          font-weight: 700;
        }
        .eval-chip {
          font-size: 10px;
          color: #6b5a40;
          font-family: 'JetBrains Mono', monospace;
        }
        .move-list-empty {
          padding: 40px 16px;
          text-align: center;
          color: #4a4030;
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          letter-spacing: 0.05em;
        }
      `}</style>

            <div className="move-list-header">Move List</div>

            <div className="move-list-scroll">
                {moves.length === 0 ? (
                    <div className="move-list-empty">No moves yet.<br />Make a move or load a game.</div>
                ) : (
                    moves.map((move) => {
                        const whiteHalfIdx = (move.moveNumber - 1) * 2 + 1;
                        const blackHalfIdx = (move.moveNumber - 1) * 2 + 2;

                        return (
                            <div key={move.moveNumber} className="move-row">
                                <div className="move-num">{move.moveNumber}.</div>

                                <div
                                    ref={currentMoveIndex === whiteHalfIdx ? activeRef : undefined}
                                    className={`move-cell ${currentMoveIndex === whiteHalfIdx ? "active" : ""}`}
                                    onClick={() => onMoveClick?.(whiteHalfIdx)}
                                >
                                    {move.white}
                                    {move.whiteAnnotation && (
                                        <span
                                            className="annotation"
                                            style={{ color: currentMoveIndex === whiteHalfIdx ? "#0d0b08" : ANNOTATION_COLORS[move.whiteAnnotation] }}
                                        >
                                            {ANNOTATION_SYMBOLS[move.whiteAnnotation]}
                                        </span>
                                    )}
                                </div>

                                <div
                                    ref={currentMoveIndex === blackHalfIdx ? activeRef : undefined}
                                    className={`move-cell ${currentMoveIndex === blackHalfIdx ? "active" : ""}`}
                                    onClick={() => move.black ? onMoveClick?.(blackHalfIdx) : undefined}
                                    style={{ opacity: move.black ? 1 : 0.3 }}
                                >
                                    {move.black ?? "…"}
                                    {move.black && move.blackAnnotation && (
                                        <span
                                            className="annotation"
                                            style={{ color: currentMoveIndex === blackHalfIdx ? "#0d0b08" : ANNOTATION_COLORS[move.blackAnnotation] }}
                                        >
                                            {ANNOTATION_SYMBOLS[move.blackAnnotation]}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}