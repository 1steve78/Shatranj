import React, { useEffect, useState } from "react";

interface AccuracyGaugeProps {
  whiteAccuracy?: number;
  blackAccuracy?: number;
}

function getGaugeColor(accuracy: number) {
  if (accuracy >= 90) return "#10b981"; // Green
  if (accuracy >= 70) return "#c8a020"; // Gold
  if (accuracy >= 50) return "#f59e0b"; // Orange
  return "#ef4444"; // Red
}

export default function AccuracyGauge({ whiteAccuracy = 0, blackAccuracy = 0 }: AccuracyGaugeProps) {
  const [wAcc, setWAcc] = useState(0);
  const [bAcc, setBAcc] = useState(0);

  useEffect(() => {
    // Basic count up animation
    const duration = 1500;
    const fps = 60;
    const totalFrames = (duration / 1000) * fps;
    let frame = 0;

    const easeOutCubic = (x: number): number => 1 - Math.pow(1 - x, 3);

    const timer = setInterval(() => {
      frame++;
      const progress = easeOutCubic(frame / totalFrames);
      
      setWAcc(whiteAccuracy * progress);
      setBAcc(blackAccuracy * progress);
      
      if (frame >= totalFrames) clearInterval(timer);
    }, 1000 / fps);

    return () => clearInterval(timer);
  }, [whiteAccuracy, blackAccuracy]);

  const radius = 30;
  const circumference = 2 * Math.PI * radius;

  // Subtract 0.1 to avoid overlapping exactly at 100%
  const wClamp = Math.min(Math.max(wAcc, 0), 99.9);
  const bClamp = Math.min(Math.max(bAcc, 0), 99.9);

  const wOffset = circumference - (wClamp / 100) * circumference;
  const bOffset = circumference - (bClamp / 100) * circumference;

  return (
    <div style={{ display: "flex", gap: "32px", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
        <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="40" cy="40" r={radius} stroke="#2a2018" strokeWidth="6" fill="none" />
          <circle 
            cx="40" cy="40" r={radius} 
            stroke={getGaugeColor(wAcc)} 
            strokeWidth="6" fill="none"
            strokeDasharray={circumference} 
            strokeDashoffset={wOffset} 
            strokeLinecap="round" 
            style={{ transition: "stroke 0.3s ease" }}
          />
          <text 
            x="40" y="-38" 
            transform="rotate(90deg)" 
            dominantBaseline="middle" textAnchor="middle" 
            fill="#e8dcc8" 
            style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "16px" }}
          >
            {wAcc.toFixed(1)}
          </text>
        </svg>
        <span style={{ color: "#e8dcc8", fontSize: "13px", fontWeight: 600, letterSpacing: "0.1em" }}>WHITE</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
        <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="40" cy="40" r={radius} stroke="#2a2018" strokeWidth="6" fill="none" />
          <circle 
            cx="40" cy="40" r={radius} 
            stroke={getGaugeColor(bAcc)} 
            strokeWidth="6" fill="none"
            strokeDasharray={circumference} 
            strokeDashoffset={bOffset} 
            strokeLinecap="round" 
            style={{ transition: "stroke 0.3s ease" }}
          />
          <text 
            x="40" y="-38" 
            transform="rotate(90deg)" 
            dominantBaseline="middle" textAnchor="middle" 
            fill="#8b7355" 
            style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "16px" }}
          >
            {bAcc.toFixed(1)}
          </text>
        </svg>
        <span style={{ color: "#8b7355", fontSize: "13px", fontWeight: 600, letterSpacing: "0.1em" }}>BLACK</span>
      </div>
    </div>
  );
}
