from fastapi import APIRouter
from pydantic import BaseModel
from app.services.pgn_service import parse_pgn
from app.services.engine_service import analyze_position
from app.services.analysis_service import classify_move

router = APIRouter()

class PGNRequest(BaseModel):
    pgn: str

@router.post("/analyze")
def analyze_game(request: PGNRequest):
    positions = parse_pgn(request.pgn)

    results = []
    prev_score = 0

    for pos in positions:
        analysis = analyze_position(pos["fen"])

        move_type = classify_move(prev_score, analysis["score"])

        results.append({
            "move": pos["move"],
            "score": analysis["score"],
            "best_move": analysis["best_move"],
            "type": move_type
        })

        prev_score = analysis["score"]

    return {"analysis": results}