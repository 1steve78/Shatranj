interface EvalBarProps {
    evaluation?: number; // +positive = white advantage, -negative = black
    mate?: number | null; // moves to mate
    isVertical?: boolean;
}

export default function EvalBar({ evaluation = 0, mate = null, isVertical = true }: EvalBarProps) {
    // Clamp eval to [-10, 10] for display
    const clamped = Math.max(-10, Math.min(10, evaluation));
    // White percentage: 0% = full black win, 100% = full white win
    const whitePercent = mate !== null
        ? (mate > 0 ? 98 : 2)
        : 50 + (clamped / 10) * 48;

    const evalText = mate !== null
        ? `M${Math.abs(mate)}`
        : evaluation > 0
            ? `+${evaluation.toFixed(1)}`
            : evaluation.toFixed(1);

    return (
        <div style={{ display: "flex", flexDirection: isVertical ? "column" : "row", alignItems: "center", gap: 8 }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=JetBrains+Mono:wght@400;700&display=swap');
        .eval-bar-container {
          position: relative;
          background: #1a1510;
          border: 1px solid #3a3028;
          overflow: hidden;
          box-shadow: inset 0 0 12px rgba(0,0,0,0.5);
        }
        .eval-bar-container.vertical {
          width: 28px;
          height: 512px;
          border-radius: 4px;
        }
        .eval-bar-container.horizontal {
          width: 512px;
          height: 28px;
          border-radius: 4px;
        }
        .eval-fill-black {
          background: #0d0d0d;
          transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .eval-fill-white {
          background: linear-gradient(180deg, #f5f0e8 0%, #d4c4a0 100%);
          transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .eval-fill-black.vertical { width: 100%; }
        .eval-fill-white.vertical { width: 100%; }
        .eval-fill-black.horizontal { height: 100%; }
        .eval-fill-white.horizontal { height: 100%; }
        .eval-center-line {
          position: absolute;
          background: #8b7355;
          opacity: 0.6;
        }
        .eval-center-line.vertical {
          width: 100%; height: 1px;
          top: 50%; left: 0;
        }
        .eval-center-line.horizontal {
          height: 100%; width: 1px;
          left: 50%; top: 0;
        }
        .eval-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.03em;
          color: #c8a96e;
          text-align: center;
          min-width: 40px;
        }
        .eval-label.mate-white { color: #ffd700; }
        .eval-label.mate-black { color: #ff6b35; }
      `}</style>

            <div className={`eval-bar-container ${isVertical ? "vertical" : "horizontal"}`}>
                {isVertical ? (
                    <>
                        <div
                            className="eval-fill-black vertical"
                            style={{ height: `${100 - whitePercent}%` }}
                        />
                        <div
                            className="eval-fill-white vertical"
                            style={{ height: `${whitePercent}%` }}
                        />
                    </>
                ) : (
                    <div style={{ display: "flex", height: "100%", width: "100%" }}>
                        <div
                            className="eval-fill-black horizontal"
                            style={{ width: `${100 - whitePercent}%` }}
                        />
                        <div
                            className="eval-fill-white horizontal"
                            style={{ width: `${whitePercent}%` }}
                        />
                    </div>
                )}
                <div className={`eval-center-line ${isVertical ? "vertical" : "horizontal"}`} />
            </div>

            <div className={`eval-label ${mate !== null ? (mate > 0 ? "mate-white" : "mate-black") : ""}`}>
                {evalText}
            </div>
        </div>
    );
}