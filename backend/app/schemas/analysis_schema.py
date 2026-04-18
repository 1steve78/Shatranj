from pydantic import BaseModel, Field
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
    cp_loss: float = 0.0
    pv_lines: list[str] = Field(default_factory=list)
    motifs: list[str] = Field(default_factory=list)
    phase: str = ""
    is_key_moment: bool = False


class AnalysisResponse(BaseModel):
    analysis: list[MoveResult]
    summary: Optional[str]          # Overall game summary when explain=True
    accuracy: Optional[float] = None
    estimated_elo: Optional[int] = None
