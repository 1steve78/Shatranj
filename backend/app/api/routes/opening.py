import chess
from fastapi import APIRouter, HTTPException, Query

from app.services.engine_service import fetch_opening_explorer

router = APIRouter(tags=["Openings"])


@router.get("/opening", response_model=dict)
async def lookup_opening(fen: str = Query(..., min_length=1)):
    try:
        chess.Board(fen)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid FEN.")

    book_data = await fetch_opening_explorer(fen)
    if not book_data.get("is_book"):
        raise HTTPException(status_code=404, detail="Opening not found.")

    return {
        "name": book_data.get("name") or "Book Opening",
        "eco": book_data.get("eco") or "",
        "pgn": "",
    }
