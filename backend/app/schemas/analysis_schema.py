from pydantic import BaseModel
from typing import Optional


class AnalysisRequest(BaseModel):
    pgn: str
    explain: bool = False   # Set True to get AI explanations (slower, costs tokens)


class MoveResult(BaseModel):
    move: str
    score: float
    best_move: Optional[str]
    type: str                       # blunder / mistake / inaccuracy / good
    explanation: Optional[str]      # Only present when explain=True


class AnalysisResponse(BaseModel):
    analysis: list[MoveResult]
    summary: Optional[str]          # Overall game summary when explain=True
