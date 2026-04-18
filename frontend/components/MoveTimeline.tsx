import React, { useMemo } from "react";
import type { PositionAnalysis } from "@/hooks/useAnalysis";
import { getMoveClassification } from "@/lib/analysisLogic";

interface MoveTimelineProps {
  totalMoves: number;
  analysisByMoveIndex: Record<number, PositionAnalysis>;
  currentMoveIndex: number;
  onMoveClick: (index: number) => void;
}

export default function MoveTimeline({ 
  totalMoves, 
  analysisByMoveIndex, 
  currentMoveIndex, 
  onMoveClick 
}: MoveTimelineProps) {

  const getColor = (type: string) => {
    switch(type) {
      case "brilliant": return "#2dd4bf"; // Cyan
      case "great": return "#3b82f6"; // Blue
      case "best": return "#10b981"; // Green
      case "good": return "#84cc16"; // Lime
      case "inaccuracy": return "#facc15"; // Yellow
      case "mistake": return "#f59e0b"; // Orange
      case "blunder": return "#ef4444"; // Red
      default: return "#2a2018"; // Pending/Unknown
    }
  };

  const blocks = useMemo(() => {
    let components = [];
    for (let i = 1; i <= totalMoves; i++) {
      const isWhiteTurn = i % 2 !== 0;
      
      const prev = analysisByMoveIndex[i - 1];
      const curr = analysisByMoveIndex[i];
      
      const { type } = getMoveClassification(prev, curr, isWhiteTurn);
      const color = getColor(type);

      const isActive = currentMoveIndex === i;

      components.push(
        <div 
          key={i}
          onClick={() => onMoveClick(i)}
          title={`Move ${Math.ceil(i/2)}${isWhiteTurn ? '.' : '...'} - ${type}`}
          style={{
            flex: 1,
            height: "12px",
            backgroundColor: color,
            cursor: "pointer",
            opacity: isActive || type !== "pending" ? 1 : 0.3,
            transition: "all 0.2s",
            transform: isActive ? "scaleY(1.4)" : "scaleY(1)",
            borderTop: isActive ? "2px solid #e8dcc8" : "none",
            borderBottom: isActive ? "2px solid #e8dcc8" : "none"
          }}
        />
      );
    }
    return components;
  }, [totalMoves, analysisByMoveIndex, currentMoveIndex, onMoveClick]);

  return (
    <div style={{ width: "100%", padding: "12px", background: "#0a0805", borderTop: "1px solid #1a1510", flexShrink: 0 }}>
        <style>{`
          .timeline-wrap {
            display: flex;
            gap: 2px;
            align-items: center;
            height: 20px;
            width: 100%;
          }
          .timeline-wrap > div:hover {
            transform: scaleY(1.2) !important;
            opacity: 1 !important;
          }
          .timeline-label {
            font-family: 'Rajdhani', sans-serif;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            color: #4a4030;
            margin-bottom: 6px;
          }
        `}</style>
      <div className="timeline-label">Match Timeline</div>
      <div className="timeline-wrap">
        {blocks}
      </div>
    </div>
  );
}
