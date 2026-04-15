from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.schemas.analysis_schema import AnalysisRequest, AnalysisResponse
from app.services.pgn_service import parse_pgn
from app.services.engine_service import analyze_position
from app.services.analysis_service import classify_move
from app.services.ai_service import explain_move, explain_game_summary
from app.db.session import get_db
from app.models.game import Game

router = APIRouter(prefix="/analyze", tags=["Analysis"])

class PositionRequest(BaseModel):
    fen: str
    depth: Optional[int] = 15

@router.post("", response_model=dict)
def analyze_single_position(request: PositionRequest):
    """
    Evaluates a single position (FEN) and returns eval, mate, and best move.
    """
    result = analyze_position(request.fen, depth=request.depth)
    return {
        "evaluation": result["evaluation"],
        "mate": result["mate"],
        "bestMove": result["best_move"] or "",
        "depth": result["depth"],
        "lines": []
    }

@router.post("/game", response_model=AnalysisResponse)
def analyze_game(request: AnalysisRequest, db: Session = Depends(get_db)):
    """
    Accepts a PGN string, analyzes every move with Stockfish,
    classifies each move, and optionally generates AI explanations.
    """
    try:
        positions = parse_pgn(request.pgn)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid PGN format.")

    if not positions:
        raise HTTPException(status_code=400, detail="No moves found in PGN.")

    results = []
    prev_score = 0.0

    for pos in positions:
        analysis = analyze_position(pos["fen"])
        move_type = classify_move(prev_score, analysis["score"])

        explanation = None
        if request.explain:
            explanation = explain_move(
                move=pos["move"],
                move_type=move_type,
                score=analysis["score"],
                best_move=analysis["best_move"] or "N/A"
            )

        results.append({
            "move": pos["move"],
            "score": analysis["score"],
            "best_move": analysis["best_move"],
            "type": move_type,
            "explanation": explanation
        })

        prev_score = analysis["score"]

    summary = None
    if request.explain:
        summary = explain_game_summary(results)

    # Persist the game PGN to DB
    db_game = Game(pgn=request.pgn)
    db.add(db_game)
    db.commit()

    return {"analysis": results, "summary": summary}
