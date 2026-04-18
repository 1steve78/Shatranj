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

from fastapi import BackgroundTasks
import asyncio
from app.services.engine_service import analyze_position_async

@router.post("/import", response_model=dict)
async def import_game(payload: GameImportRequest, background_tasks: BackgroundTasks):
    """Parses a PGN into SAN moves, FENs, and headers. Speculatively precomputes first 10 moves."""
    if not payload.pgn:
        return {"initialFen": payload.fen, "headers": {}, "moves": []}
    try:
        parsed = parse_pgn_detailed(payload.pgn)
        
        # Speculative precomputation for first 10 FENs
        fens_to_precompute = [m["fen"] for m in parsed["moves"][:10]]
        
        async def speculative_eval(fens):
            tasks = [analyze_position_async(fen, depth=15) for fen in fens]
            await asyncio.gather(*tasks, return_exceptions=True)
                    
        asyncio.create_task(speculative_eval(fens_to_precompute))
        return parsed
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("", response_model=GameOut, status_code=201)
def save_game(payload: GameCreate, db: Session = Depends(get_db)):
    """Save a raw PGN game to the database."""
    game = Game(pgn=payload.pgn)
    db.add(game)
    db.commit()
    db.refresh(game)
    return game


@router.get("", response_model=list[GameOut])
def list_games(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    """Return a paginated list of saved games."""
    return db.query(Game).offset(skip).limit(limit).all()


@router.get("/{game_id}", response_model=GameOut)
def get_game(game_id: int, db: Session = Depends(get_db)):
    """Fetch a single game by ID."""
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")
    return game


@router.delete("/{game_id}", status_code=204)
def delete_game(game_id: int, db: Session = Depends(get_db)):
    """Delete a saved game by ID."""
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")
    db.delete(game)
    db.commit()
