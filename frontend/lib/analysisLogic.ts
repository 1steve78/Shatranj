import type { PositionAnalysis } from "@/hooks/useAnalysis";

export function calculateAccuracy(prevScore: number, newScore: number, isWhiteTurn: boolean): { accuracy: number, cpLoss: number } {
    let diff = 0;
    
    // Mate threshold mappings (huge score)
    if (prevScore > 50000 && newScore > 50000) return { accuracy: 100, cpLoss: 0 };
    if (prevScore < -50000 && newScore < -50000) return { accuracy: 100, cpLoss: 0 };
    
    diff = isWhiteTurn ? prevScore - newScore : newScore - prevScore;
    const cpLoss = Math.max(0, diff);
    
    const accuracy = 100 * Math.exp(-0.004 * cpLoss);
    return { accuracy: Number(accuracy.toFixed(2)), cpLoss };
}

export function classifyMove(
    cpLoss: number, precision: number, isBestMove: boolean, isSacrifice: boolean = false
): string {
    if ((cpLoss < 10 && isSacrifice) || (precision > 98 && isSacrifice)) return "brilliant";
    if (precision > 95 && isBestMove && cpLoss > 0) return "great";
    if (isBestMove || cpLoss === 0) return "best";
    if (precision >= 80) return "good";
    if (precision >= 60) return "inaccuracy";
    if (precision >= 30) return "mistake";
    return "blunder";
}

export function getMoveClassification(
     prevAnalysis: PositionAnalysis | undefined, 
     currAnalysis: PositionAnalysis | undefined, 
     isWhiteTurn: boolean, 
     playedMoveUci: string | null = null
): { type: string, accuracy: number, cpLoss: number } {
    if (!prevAnalysis || !currAnalysis) return { type: "pending", accuracy: 0, cpLoss: 0 };

    const getScore = (a: PositionAnalysis) => {
        if (a.mate !== null) return a.mate > 0 ? 100000 - Math.abs(a.mate) : -100000 + Math.abs(a.mate);
        return (a.evaluation || 0) * 100; // API returns evaluation in pawns (e.g. +1.2), convert to CP
    };

    const prevScore = getScore(prevAnalysis);
    const newScore = getScore(currAnalysis);

    const { accuracy, cpLoss } = calculateAccuracy(prevScore, newScore, isWhiteTurn);
    
    // Approx best move parsing: compare played move to engine's previous best move suggestion (if we have uci)
    // For now we will rely on CP loss as the primary heuristic for 'best' move if UCI doesn't match perfectly
    const isBestMove = cpLoss <= 5; 
    
    return { type: classifyMove(cpLoss, accuracy, isBestMove), accuracy, cpLoss };
}
