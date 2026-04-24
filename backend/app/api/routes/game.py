from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.game import Game
from app.schemas.game_schema import GameCreate, GameOut
from app.services.pgn_service import parse_pgn_detailed

router = APIRouter(prefix="/games", tags=["Games"])


class GameImportRequest(BaseModel):
    pgn: str = ""
    fen: str = ""


@router.post("/import", response_model=dict)
async def import_game(payload: GameImportRequest):
    """
    Parse a PGN (or bare FEN) into SAN moves, FENs, and headers.
    The WebSocket /analyze/stream handles all evaluation — no speculative
    pre-computation here.
    """
    if not payload.pgn:
        # Bare FEN: return a game with zero moves
        return {"initialFen": payload.fen, "headers": {}, "moves": []}

    try:
        return parse_pgn_detailed(payload.pgn)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── CRUD ────────────────────────────────────────────────────────────────────

@router.post("", response_model=GameOut, status_code=201)
def save_game(payload: GameCreate, db: Session = Depends(get_db)):
    """Persist a raw PGN game to the database."""
    game = Game(pgn=payload.pgn)
    db.add(game)
    db.commit()
    db.refresh(game)
    return game


@router.get("", response_model=list[GameOut])
def list_games(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    return db.query(Game).offset(skip).limit(limit).all()


@router.get("/{game_id}", response_model=GameOut)
def get_game(game_id: int, db: Session = Depends(get_db)):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")
    return game


@router.delete("/{game_id}", status_code=204)
def delete_game(game_id: int, db: Session = Depends(get_db)):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")
    db.delete(game)
    db.commit()
