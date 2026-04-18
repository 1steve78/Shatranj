import { useState, CSSProperties } from "react";
import { Chessboard, type Arrow, type ChessboardOptions } from "react-chessboard";

interface ChessBoardProps {
    fen?: string;
    bestMoveArrows?: string[][];
    highlightedSquares?: string[];
    lastMove?: { from: string; to: string };
    flipped?: boolean;
    isLoading?: boolean;
    loadingLabel?: string;
    onSquareClick?: (square: string) => void;
}

export default function ChessBoard({
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    bestMoveArrows = [],
    highlightedSquares = [],
    lastMove,
    flipped = false,
    isLoading = false,
    loadingLabel = "Analyzing position",
    onSquareClick,
}: ChessBoardProps) {
    const [selected, setSelected] = useState<string | null>(null);

    const handleClick = (sq: string) => {
        setSelected(selected === sq ? null : sq);
        onSquareClick?.(sq);
    };

    const squareStyles: Record<string, CSSProperties> = {};

    if (lastMove) {
        squareStyles[lastMove.from] = { backgroundColor: "rgba(253, 253, 146, 0.8)" };
        squareStyles[lastMove.to] = { backgroundColor: "rgba(253, 253, 146, 0.8)" };
    }

    if (selected) {
        squareStyles[selected] = {
            backgroundColor: "#fdfd92",
            boxShadow: "inset 0 0 0 3px #dce556",
        };
    }

    highlightedSquares.forEach((sq) => {
        squareStyles[sq] = {
            ...squareStyles[sq],
            background: "rgba(255,200,0,0.4)",
            borderRadius: "50%",
        };
    });

    const arrows: Arrow[] = bestMoveArrows.map((a) => ({
        startSquare: a[0],
        endSquare: a[1],
        color: a[2] ?? "rgba(228, 183, 45, 0.95)",
    })).filter((arrow) => Boolean(arrow.startSquare && arrow.endSquare));

    const bestMove = arrows[0];

    if (bestMove) {
        squareStyles[bestMove.startSquare] = {
            ...squareStyles[bestMove.startSquare],
            background: "linear-gradient(135deg, rgba(228, 183, 45, 0.32), rgba(245, 230, 200, 0.18))",
            borderRadius: 0,
            boxShadow: "inset 0 0 0 4px rgba(228, 183, 45, 0.88)",
        };
        squareStyles[bestMove.endSquare] = {
            ...squareStyles[bestMove.endSquare],
            background: "radial-gradient(circle, rgba(228, 183, 45, 0.72) 0 24%, rgba(228, 183, 45, 0.26) 25% 100%)",
            borderRadius: 0,
            boxShadow: "inset 0 0 0 4px rgba(228, 183, 45, 0.88)",
        };
    }

    const options: ChessboardOptions = {
        position: fen,
        boardOrientation: flipped ? "black" : "white",
        arrows,
        arrowOptions: {
            color: "rgba(228, 183, 45, 0.95)",
            secondaryColor: "rgba(245, 230, 200, 0.95)",
            tertiaryColor: "rgba(180, 126, 67, 0.95)",
            arrowLengthReducerDenominator: 3.4,
            sameTargetArrowLengthReducerDenominator: 2.2,
            arrowWidthDenominator: 7,
            activeArrowWidthMultiplier: 1.35,
            opacity: 0.96,
            activeOpacity: 1,
            arrowStartOffset: 0.18,
        },
        allowDrawingArrows: false,
        onSquareClick: ({ square }) => handleClick(square),
        squareStyles,
        squareRenderer: ({ square, children }) => {
            const isBestFrom = bestMove?.startSquare === square;
            const isBestTo = bestMove?.endSquare === square;

            return (
                <div style={{ position: "relative", width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
                    {children}
                    {(isBestFrom || isBestTo) && (
                        <span
                            style={{
                                position: "absolute",
                                left: isBestFrom ? 5 : "auto",
                                right: isBestTo ? 5 : "auto",
                                top: isBestFrom ? 5 : "auto",
                                bottom: isBestTo ? 5 : "auto",
                                padding: "2px 5px",
                                borderRadius: 3,
                                background: "rgba(13, 11, 8, 0.78)",
                                color: "#f5e6c8",
                                fontFamily: "Rajdhani, Arial, sans-serif",
                                fontSize: 10,
                                fontWeight: 700,
                                lineHeight: 1,
                                letterSpacing: "0.08em",
                                pointerEvents: "none",
                                textTransform: "uppercase",
                            }}
                        >
                            {isBestFrom ? "Move" : "Here"}
                        </span>
                    )}
                </div>
            );
        },
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <style>{`
                .chess-board-wrap {
                    position: relative;
                }

                .board-loading-overlay {
                    position: absolute;
                    inset: 0;
                    z-index: 20;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    background: rgba(13, 11, 8, 0.72);
                    border: 1px solid rgba(200, 160, 32, 0.24);
                    backdrop-filter: blur(2px);
                    pointer-events: auto;
                }

                .board-loading-piece {
                    width: 68px;
                    height: 68px;
                    display: grid;
                    place-items: center;
                    border-radius: 50%;
                    border: 1px solid rgba(200, 160, 32, 0.45);
                    background: radial-gradient(circle, rgba(200, 160, 32, 0.22), rgba(18, 16, 13, 0.92));
                    color: #f5e6c8;
                    font-size: 42px;
                    line-height: 1;
                    animation: board-piece-think 1.3s ease-in-out infinite;
                    box-shadow: 0 0 28px rgba(200, 160, 32, 0.18);
                }

                .board-loading-text {
                    font-family: Rajdhani, Arial, sans-serif;
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 0.14em;
                    color: #c8a020;
                    text-transform: uppercase;
                    text-align: center;
                }

                @keyframes board-piece-think {
                    0%, 100% {
                        opacity: 0.7;
                        transform: translateY(0) scale(0.96);
                    }
                    50% {
                        opacity: 1;
                        transform: translateY(-5px) scale(1.02);
                    }
                }
            `}</style>
            <div className="chess-board-wrap">
                <div className="board-container">
                    <Chessboard options={options} />
                </div>
                {isLoading && (
                    <div className="board-loading-overlay" role="status" aria-live="polite">
                        <div className="board-loading-piece" aria-hidden="true">{"\u265E"}</div>
                        <div className="board-loading-text">{loadingLabel}</div>
                    </div>
                )}
            </div>
        </div>
    );
}
