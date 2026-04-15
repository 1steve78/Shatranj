from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.game import Game
from app.schemas.game_schema import GameCreate, GameOut

router = APIRouter(prefix="/games", tags=["Games"])


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
