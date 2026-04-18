from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.schemas.analysis_schema import AnalysisRequest, AnalysisResponse
from app.services.pgn_service import parse_pgn
from app.services.engine_service import analyze_position_async, analyze_position, fetch_opening_explorer
from app.services.analysis_service import classify_move, calculate_cp_loss, calculate_accuracy, get_game_phase, estimate_elo_performance, extract_tactical_motifs, calculate_move_accuracy
from app.services.ai_service import explain_move, explain_game_summary
from app.db.session import get_db
from app.models.game import Game
import asyncio
import chess
import json

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
        "lines": result.get("pv_lines", []),
        "best_move_arrows": result.get("best_move_arrows", [])
    }

@router.post("/game", response_model=AnalysisResponse)
async def analyze_game(request: AnalysisRequest, db: Session = Depends(get_db)):
    try:
        positions = parse_pgn(request.pgn)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid PGN format.")

    if not positions:
        raise HTTPException(status_code=400, detail="No moves found in PGN.")

    # Phase 0.5: Early-Exit Opening Book Fetch
    book_moves = {}
    is_out_of_book = False
    for i, pos in enumerate(positions[:15]):
        if is_out_of_book:
            break
        book_data = await fetch_opening_explorer(pos["fen"])
        if book_data["is_book"]:
            book_moves[i] = book_data
        else:
            is_out_of_book = True

    # Phase 1: Parallel Engine Evaluations
    tasks = [analyze_position_async(pos["fen"], depth=18) for pos in positions]
    evaluations = await asyncio.gather(*tasks)

    results = []
    prev_score = 0.0
    total_cp_loss = 0.0
    
    max_cp_swing = 0
    key_moment_idx = -1
    
    # Phase 2: Heuristics & Classification
    for i, (pos, analysis) in enumerate(zip(positions, evaluations)):
        is_white_turn = (i % 2 == 0) # Assumes standard PGN starting from move 1 White.
        
        # Fallback dictionary keys for PV safety
        pv_lines = analysis.get("pv_lines", [])
        score = analysis.get("score", 0)
        best_move = analysis.get("best_move", "")

        cp_loss = calculate_cp_loss(prev_score, score, is_white_turn)
        total_cp_loss += cp_loss
        
        if i in book_moves:
            move_type = "book"
        else:
            move_type = classify_move(cp_loss, prev_score, score, is_white_turn, is_best_move=(pos["move"] == best_move))
            if cp_loss > max_cp_swing:
                max_cp_swing = cp_loss
                key_moment_idx = i
                
        board = chess.Board(pos["fen"])
        motifs = extract_tactical_motifs(chess.Board(pos.get("before_fen", pos["fen"])), pos["move"])
        phase = get_game_phase(i // 2 + 1, board)

        results.append({
            "move": pos["move"],
            "score": score,
            "best_move": best_move,
            "type": move_type,
            "explanation": None,
            "cp_loss": cp_loss,
            "pv_lines": pv_lines,
            "motifs": motifs,
            "phase": phase,
            "is_key_moment": False
        })
        prev_score = score
        
    if key_moment_idx != -1:
        results[key_moment_idx]["is_key_moment"] = True

    move_accuracies = [calculate_move_accuracy(r["cp_loss"]) for r in results]
    accuracy = calculate_accuracy(move_accuracies) if results else 0.0
    estimated_elo = estimate_elo_performance(accuracy, player_elo=1200)

    # Phase 3: LLM Calls (Critical Moves Only)
    if request.explain:
        critical_types = {"blunder", "mistake", "great", "brilliant", "miss"}
        llm_tasks = []
        task_indices = []

        for idx, res in enumerate(results):
            if res["type"] in critical_types:
                # Add tactical context to help LLM
                motif_str = f" Context: Engine identified {', '.join(res['motifs'])}." if res["motifs"] else ""
                llm_tasks.append(asyncio.to_thread(
                    explain_move, res["move"], res["type"], res["score"], (res["best_move"] or "N/A") + motif_str
                ))
                task_indices.append(idx)

        explanations = await asyncio.gather(*llm_tasks) if llm_tasks else []
        for idx, exp in zip(task_indices, explanations):
            results[idx]["explanation"] = exp
        
        summary = await asyncio.to_thread(explain_game_summary, results)
    else:
        summary = None

    # Persist the game
    db_game = Game(pgn=request.pgn)
    db.add(db_game)
    db.commit()

    return {
        "analysis": results, 
        "summary": summary, 
        "accuracy": accuracy,
        "estimated_elo": estimated_elo
    }

@router.websocket("/stream")
async def analyze_stream(websocket: WebSocket):
    await websocket.accept()
    try:
        data = await websocket.receive_text()
        req = json.loads(data)
        fens = req.get("fens", [])
        depth = req.get("depth", 15)
        
        async def evaluate_and_send(index, fen):
            try:
                result = await analyze_position_async(fen, depth=depth)
                await websocket.send_json({"type": "eval", "index": index, "result": result})
            except Exception as e:
                pass
                
        # Fire off all evaluations concurrently (bounded by our semaphore in engine_service)
        tasks = [evaluate_and_send(i, fen) for i, fen in enumerate(fens)]
        await asyncio.gather(*tasks)
        
        await websocket.send_json({"type": "done"})
        
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"type": "error", "message": str(e)})
