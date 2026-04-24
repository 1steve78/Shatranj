import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import os
import chess
import chess.engine
from dotenv import load_dotenv
import logging
from typing import Optional, Dict, Any, List
from .redis_service import get_cached_eval, set_cached_eval

load_dotenv()
logger = logging.getLogger(__name__)

STOCKFISH_PATH = os.getenv("STOCKFISH_PATH")
if not STOCKFISH_PATH:
    raise RuntimeError("STOCKFISH_PATH is not set in environment.")


# ─── Arrow helpers ────────────────────────────────────────────────────────────

def extract_arrow_coordinates(pv_lines: List[str]) -> List[List[str]]:
    """Return [[from, to]] for the best move only."""
    if not pv_lines:
        return []
    best = pv_lines[0]
    if len(best) >= 4:
        return [[best[:2], best[2:4]]]
    return []


# ─── Engine Pool ─────────────────────────────────────────────────────────────

class EnginePool:
    def __init__(self, size: int = 4):
        self.size = size
        self.pool: asyncio.Queue = asyncio.Queue(maxsize=size)
        self.semaphore = asyncio.Semaphore(size)
        self.initialized = False
        self.lock = asyncio.Lock()

    async def initialize(self):
        async with self.lock:
            if self.initialized:
                return
            logger.info(f"Initializing EnginePool with {self.size} Stockfish instances…")
            for _ in range(self.size):
                _, engine = await chess.engine.popen_uci(STOCKFISH_PATH)
                await engine.configure({"Hash": 128})
                self.pool.put_nowait(engine)
            self.initialized = True

    async def acquire(self) -> chess.engine.Protocol:
        if not self.initialized:
            await self.initialize()
        return await self.pool.get()

    def release(self, engine: chess.engine.Protocol):
        self.pool.put_nowait(engine)

    async def close_all(self):
        while not self.pool.empty():
            engine = self.pool.get_nowait()
            await engine.quit()


engine_pool = EnginePool(size=4)


async def close_engine():
    await engine_pool.close_all()


# ─── Core analysis ───────────────────────────────────────────────────────────

async def analyze_position_async(
    fen: str,
    depth: int = 18,
    multipv: int = 2,
) -> Dict[str, Any]:
    """
    Evaluate *fen* at *depth* using Stockfish.

    Returns:
        {
            evaluation: float,   # centipawns / 100, from White's POV
            mate:        int | None,
            best_move:   str | None,  # UCI e.g. "e2e4"
            pv_lines:    list[str],   # best line in UCI
            depth:       int,
            best_move_arrows: [[from, to]],
        }
    """
    # 1. Redis cache hit?
    cached = await get_cached_eval(fen)
    if cached and cached.get("depth", 0) >= depth:
        return cached

    board = chess.Board(fen)

    # 2. Acquire engine from pool
    async with engine_pool.semaphore:
        engine = await engine_pool.acquire()
        try:
            info = await asyncio.wait_for(
                engine.analyse(board, chess.engine.Limit(depth=depth), multipv=multipv),
                timeout=25.0,
            )
        except Exception as exc:
            logger.error(f"Engine analyse error: {exc}")
            # Replace the broken engine so the pool stays full
            try:
                await engine.quit()
            except Exception:
                pass
            try:
                _, new_engine = await chess.engine.popen_uci(STOCKFISH_PATH)
                await new_engine.configure({"Hash": 128})
                engine_pool.release(new_engine)
            except Exception as clone_exc:
                logger.error(f"Failed to replace engine: {clone_exc}")
            raise exc
        engine_pool.release(engine)

    if not isinstance(info, list):
        info = [info]

    # 3. Parse PV lines
    pvs = []
    for pv_info in info:
        pov_score = pv_info["score"].white()
        cp = pov_score.score()
        mate = pov_score.mate()

        best_move = None
        pv_lines: List[str] = []
        if "pv" in pv_info and pv_info["pv"]:
            best_move = pv_info["pv"][0].uci()
            pv_lines = [m.uci() for m in pv_info["pv"]]

        eval_val = (1000 if mate > 0 else -1000) if mate is not None else (cp or 0)
        pvs.append({"score": eval_val, "mate": mate, "best_move": best_move, "pv_lines": pv_lines})

    primary = pvs[0] if pvs else {"score": 0, "mate": None, "best_move": None, "pv_lines": []}

    result: Dict[str, Any] = {
        "evaluation":       primary["score"] / 100 if primary["score"] else 0.0,
        "mate":             primary["mate"],
        "best_move":        primary["best_move"],
        "pv_lines":         primary["pv_lines"],
        "depth":            depth,
        "best_move_arrows": extract_arrow_coordinates(primary["pv_lines"]),
    }

    # 4. Write-back to Redis (fire and forget)
    try:
        asyncio.get_running_loop().create_task(set_cached_eval(fen, result))
    except RuntimeError:
        pass

    return result
