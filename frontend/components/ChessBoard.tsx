import { useState, useMemo } from "react";
import { Chess } from "chess.js";

type PieceType = string | null;
type Board = PieceType[][];

const pieceMap: Record<string, string> = {
    "pw": "♙", "pb": "♟",
    "nw": "♘", "nb": "♞",
    "bw": "♗", "bb": "♝",
    "rw": "♖", "rb": "♜",
    "qw": "♕", "qb": "♛",
    "kw": "♔", "kb": "♚",
};

interface ChessBoardProps {
    fen?: string;
    highlightedSquares?: string[];
    lastMove?: { from: string; to: string };
    flipped?: boolean;
    onSquareClick?: (square: string) => void;
}

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

export default function ChessBoard({
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    highlightedSquares = [],
    lastMove,
    flipped = false,
    onSquareClick,
}: ChessBoardProps) {
    const [selected, setSelected] = useState<string | null>(null);

    const board: Board = useMemo(() => {
        try {
            const chess = new Chess(fen);
            return chess.board().map(row => 
                row.map(sq => sq ? pieceMap[`${sq.type}${sq.color}`] || null : null)
            );
        } catch {
            return Array(8).fill(Array(8).fill(null));
        }
    }, [fen]);

    const files = flipped ? [...FILES].reverse() : FILES;
    const ranks = flipped ? [...RANKS].reverse() : RANKS;

    const squareName = (fileIdx: number, rankIdx: number) =>
        `${files[fileIdx]}${ranks[rankIdx]}`;

    const isLight = (fileIdx: number, rankIdx: number) =>
        (fileIdx + rankIdx) % 2 === 0;

    const isLastMove = (sq: string) =>
        sq === lastMove?.from || sq === lastMove?.to;

    const isHighlighted = (sq: string) => highlightedSquares.includes(sq);

    const handleClick = (sq: string) => {
        setSelected(selected === sq ? null : sq);
        onSquareClick?.(sq);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&display=swap');
        .chess-board-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Rajdhani', sans-serif;
        }
        .rank-labels {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .rank-label {
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #8b7355;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.05em;
          width: 16px;
        }
        .board-grid {
          display: grid;
          grid-template-columns: repeat(8, 64px);
          grid-template-rows: repeat(8, 64px);
          border: 2px solid #3a3028;
          box-shadow: 0 0 0 1px #1a1510, 0 20px 60px rgba(0,0,0,0.8), inset 0 0 40px rgba(0,0,0,0.2);
        }
        .square {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          transition: filter 0.1s;
        }
        .square:hover { filter: brightness(1.15); }
        .square.light { background: #c8a97e; }
        .square.dark  { background: #6b4c2a; }
        .square.last-move.light { background: #d4b96a; }
        .square.last-move.dark  { background: #b8932a; }
        .square.selected { background: #d4a017 !important; box-shadow: inset 0 0 0 3px #ffd700; }
        .square.highlighted::after {
          content: '';
          position: absolute;
          width: 24px; height: 24px;
          background: rgba(255,200,0,0.4);
          border-radius: 50%;
          pointer-events: none;
        }
        .piece {
          font-size: 42px;
          line-height: 1;
          user-select: none;
          filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));
          transition: transform 0.1s;
        }
        .square:hover .piece { transform: scale(1.05); }
        .file-labels {
          display: flex;
          padding-left: 24px;
        }
        .file-label {
          width: 64px;
          text-align: center;
          color: #8b7355;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.05em;
          padding-top: 6px;
          font-family: 'Rajdhani', sans-serif;
        }
      `}</style>

            <div className="chess-board-wrap">
                <div className="rank-labels">
                    {ranks.map((r) => (
                        <div key={r} className="rank-label">{r}</div>
                    ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <div className="board-grid">
                        {ranks.map((_, rankIdx) =>
                            files.map((_, fileIdx) => {
                                const sq = squareName(fileIdx, rankIdx);
                                const light = isLight(fileIdx, rankIdx);
                                const piece = board[rankIdx]?.[fileIdx];
                                const cls = [
                                    "square",
                                    light ? "light" : "dark",
                                    isLastMove(sq) ? "last-move" : "",
                                    selected === sq ? "selected" : "",
                                    isHighlighted(sq) ? "highlighted" : "",
                                ].filter(Boolean).join(" ");

                                return (
                                    <div key={sq} className={cls} onClick={() => handleClick(sq)}>
                                        {piece && <span className="piece">{piece}</span>}
                                    </div>
                                );
                            })
                        )}
                    </div>
                    <div className="file-labels">
                        {files.map((f) => (
                            <div key={f} className="file-label">{f}</div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}