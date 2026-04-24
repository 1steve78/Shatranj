from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.engine_service import analyze_position_async
import asyncio
import json

router = APIRouter(prefix="/analyze", tags=["Analysis"])


# ─── Single-position endpoint (used by the board when no game is loaded) ─────

@router.post("", response_model=dict)
async def analyze_single_position(request: dict):
    """
    Evaluate a single FEN.  Body: { fen: str, depth?: int }
    """
    fen   = request.get("fen", "")
    depth = int(request.get("depth", 18))
    result = await analyze_position_async(fen, depth=depth)
    return {
        "evaluation":       result["evaluation"],
        "mate":             result["mate"],
        "bestMove":         result["best_move"] or "",
        "depth":            result["depth"],
        "pv_lines":         result.get("pv_lines", []),
        "best_move_arrows": result.get("best_move_arrows", []),
    }


# ─── WebSocket streaming evaluator ───────────────────────────────────────────

@router.websocket("/stream")
async def analyze_stream(websocket: WebSocket):
    """
    Protocol
    --------
    Client  →  { fens: string[], depth?: number }
    Server  ←  { type: "eval",  index: int, result: EvalResult }  (one per FEN)
    Server  ←  { type: "done" }
    Server  ←  { type: "error", message: string }

    EvalResult shape
    ----------------
    {
        evaluation:       float,      # pawns, White POV
        mate:             int | null,
        best_move:        string,     # UCI
        pv_lines:         string[],   # UCI
        depth:            int,
        best_move_arrows: [string, string][],
    }
    """
    await websocket.accept()

    WORKERS = 4

    try:
        # Wait for the initial payload
        raw = await websocket.receive_text()
        payload = json.loads(raw)

        fens: list[str] = payload.get("fens", [])
        depth: int      = int(payload.get("depth", 18))

        if not fens:
            await websocket.send_json({"type": "done"})
            return

        # Simple FIFO queue — no priority bumping needed
        queue: asyncio.Queue = asyncio.Queue()
        for i, fen in enumerate(fens):
            await queue.put((i, fen))

        completed = 0
        total     = len(fens)
        lock      = asyncio.Lock()   # guard `completed` counter

        async def worker():
            nonlocal completed
            while True:
                try:
                    index, fen = queue.get_nowait()
                except asyncio.QueueEmpty:
                    break
                try:
                    result = await analyze_position_async(fen, depth=depth)
                    await websocket.send_json({
                        "type":   "eval",
                        "index":  index,
                        "result": {
                            "evaluation":       result["evaluation"],
                            "mate":             result["mate"],
                            "bestMove":         result["best_move"] or "",
                            "pv_lines":         result.get("pv_lines", []),
                            "depth":            result["depth"],
                            "best_move_arrows": result.get("best_move_arrows", []),
                        },
                    })
                except Exception as exc:
                    # Log but don't abort the whole stream for one bad position
                    try:
                        await websocket.send_json({
                            "type":    "error",
                            "index":   index,
                            "message": str(exc),
                        })
                    except Exception:
                        pass
                finally:
                    async with lock:
                        completed += 1
                    queue.task_done()

        # Run all workers concurrently
        await asyncio.gather(*[worker() for _ in range(WORKERS)])
        await websocket.send_json({"type": "done"})

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        try:
            await websocket.send_json({"type": "error", "message": str(exc)})
        except Exception:
            pass
