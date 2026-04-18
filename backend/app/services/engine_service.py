import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import os
import chess
import chess.engine
from dotenv import load_dotenv
import asyncio
import logging
from typing import Optional, Dict, Any, List
from .redis_service import get_cached_eval, set_cached_eval

load_dotenv()
logger = logging.getLogger(__name__)

STOCKFISH_PATH = os.getenv("STOCKFISH_PATH")
if not STOCKFISH_PATH:
    raise RuntimeError("STOCKFISH_PATH is not set in environment.")

def extract_arrow_coordinates(pv_lines: List[str]) -> List[List[str]]:
    if not pv_lines: return []
    best_move = pv_lines[0]
    if len(best_move) >= 4:
        return [[best_move[:2], best_move[2:4]]]
    return []

class EnginePool:
    def __init__(self, size: int = 4):
        self.size = size
        self.pool = asyncio.Queue(maxsize=size)
        self.semaphore = asyncio.Semaphore(size)
        self.initialized = False
        self.lock = asyncio.Lock()

    async def initialize(self):
        async with self.lock:
            if self.initialized:
                return
            logger.info(f"Initializing EnginePool with {self.size} instances...")
            for _ in range(self.size):
                # Spawn asynchronous UCI protocol instances
                _, engine = await chess.engine.popen_uci(STOCKFISH_PATH)
                # Configure 128MB Hash for each Engine instance
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

async def fetch_opening_explorer(fen: str):
    # Mocking out the Lichess API hit as requested because it fails the project
    return {"is_book": False, "name": None, "eco": None}

def calculate_adaptive_depth(fen: str) -> int:
    """Implement lightweight heuristic to determine necessary depth without burning CPU."""
    board = chess.Board(fen)
    if board.is_check():
        return 14 # Captures/Checks need forced line clarity without huge tree
    # If captures are available, depth 14
    if any(board.is_capture(move) for move in board.legal_moves):
        return 14
    
    return 12 # Default quiet position depth, saves massive time

async def analyze_position_async(fen: str, depth: int = 18, multipv: int = 2):
    # 1. Check Redis Cache First
    cached = await get_cached_eval(fen)
    # Ensure cache poisoning protection: Only accept if cached depth >= requested
    if cached and cached.get("depth", 0) >= depth:
        return cached

    # 2. Fast track heuristics (determines adaptive depth if standard 18 was requested)
    actual_depth = calculate_adaptive_depth(fen) if depth == 18 else depth

    board = chess.Board(fen)
    
    # 3. Engine Pool Acquire via Queue Backpressure
    async with engine_pool.semaphore:
        engine = await engine_pool.acquire()
        try:
            info = await asyncio.wait_for(
                engine.analyse(board, chess.engine.Limit(depth=actual_depth), multipv=multipv),
                timeout=25.0
            )
        except Exception as e:
            logger.error(f"Engine analyze error: {e}")
            try:
                await engine.quit()
            except Exception:
                pass
            
            # Spawn substitute engine to prevent starvation
            try:
                _, new_engine = await chess.engine.popen_uci(STOCKFISH_PATH)
                await new_engine.configure({"Hash": 128})
                engine_pool.release(new_engine)
            except Exception as clone_e:
                logger.error(f"Failed to clone engine: {clone_e}")
                
            raise e
            
        engine_pool.release(engine)

    if not isinstance(info, list):
        info = [info]

    pvs = []
    for pv_info in info:
        pov_score = pv_info["score"].white()
        score = pov_score.score()
        mate = pov_score.mate()
        
        best_move = None
        pv_lines = []
        if "pv" in pv_info and len(pv_info["pv"]) > 0:
            best_move = pv_info["pv"][0].uci()
            pv_lines = [m.uci() for m in pv_info["pv"]]
            
        if mate is not None:
            eval_val = 1000 if mate > 0 else -1000
        else:
            eval_val = score if score is not None else 0

        pvs.append({
            "score": eval_val,
            "mate": mate,
            "best_move": best_move,
            "pv_lines": pv_lines
        })
    
    primary = pvs[0] if pvs else {"score": 0, "mate": None, "best_move": None, "pv_lines": []}
    
    result = {
        "score": primary["score"],
        "evaluation": primary["score"] / 100 if primary["score"] else 0,
        "mate": primary["mate"],
        "depth": actual_depth, # Reflect actual generated depth
        "best_move": primary["best_move"],
        "pv_lines": primary["pv_lines"],
        "pvs": pvs,
        "best_move_arrows": extract_arrow_coordinates(primary["pv_lines"])
    }

    # 4. Save to Redis in background task
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(set_cached_eval(fen, result))
    except RuntimeError:
        # If no running loop, just await it directly or ignore (e.g. tests)
        pass

    return result
