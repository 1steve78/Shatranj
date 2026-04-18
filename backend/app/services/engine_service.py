import os
import chess
import chess.engine
from dotenv import load_dotenv
import asyncio
import httpx
import logging
import threading

load_dotenv()
logger = logging.getLogger(__name__)

def extract_arrow_coordinates(pv_lines):
    if not pv_lines: return []
    best_move = pv_lines[0]
    if len(best_move) >= 4:
        return [[best_move[:2], best_move[2:4]]]
    return []

STOCKFISH_PATH = os.getenv("STOCKFISH_PATH")
engine = None
engine_lock = threading.Lock()


def get_engine():
    global engine

    if engine is None:
        if not STOCKFISH_PATH:
            raise RuntimeError("STOCKFISH_PATH is not set")
        engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
    return engine


def close_engine():
    global engine

    with engine_lock:
        if engine is not None:
            engine.quit()
            engine = None

def analyze_position(fen: str, depth: int = 18):
    board = chess.Board(fen)

    # 🔥 Single call to engine, protected by thread lock for concurrency safety
    with engine_lock:
        info = get_engine().analyse(board, chess.engine.Limit(depth=depth), multipv=3)

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
            
        # Clamp mate scores
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
    
    return {
        "score": primary["score"],
        "evaluation": primary["score"] / 100 if primary["score"] else 0,
        "mate": primary["mate"],
        "depth": depth,
        "best_move": primary["best_move"],
        "pv_lines": primary["pv_lines"],
        "pvs": pvs,
        "best_move_arrows": extract_arrow_coordinates(primary["pv_lines"])
    }

async def fetch_lichess_cloud_eval(fen: str, multipv: int = 3):
    url = f"https://lichess.org/api/cloud/eval"
    params = {"fen": fen, "multiPv": multipv}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params, timeout=2.0)
            if response.status_code == 200:
                data = response.json()
                if "pvs" in data and len(data["pvs"]) > 0:
                    primary_pv = data["pvs"][0]
                    score = primary_pv.get("cp", 0)
                    mate = primary_pv.get("mate")
                    moves = primary_pv.get("moves", "").split()
                    best_move = moves[0] if moves else None
                    
                    if mate is not None:
                        score = 100000 if mate > 0 else -100000

                    return {
                        "score": score,
                        "evaluation": score / 100 if score else 0,
                        "mate": mate,
                        "depth": data.get("depth", 15),
                        "best_move": best_move,
                        "pv_lines": moves,
                        "best_move_arrows": extract_arrow_coordinates(moves),
                        "source": "lichess"
                    }
        except Exception as e:
            logger.warning(f"Lichess API error: {e}")
    return None

async def fetch_opening_explorer(fen: str):
    url = "https://explorer.lichess.ovh/masters"
    params = {"fen": fen, "moves": 1}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params, timeout=2.0)
            if response.status_code == 200:
                data = response.json()
                total_games = data.get("white", 0) + data.get("draws", 0) + data.get("black", 0)
                if total_games > 5:
                    opening = data.get("opening", {})
                    return {
                        "is_book": True,
                        "name": opening.get("name", "Book Opening") if opening else "Book Opening",
                        "eco": opening.get("eco", "") if opening else ""
                    }
        except Exception as e:
            logger.warning(f"Lichess Explorer API error: {e}")
    return {"is_book": False, "name": None, "eco": None}

engine_semaphore = asyncio.Semaphore(4)

async def analyze_position_async(fen: str, depth: int = 18):
    # Try lichess first
    cached = await fetch_lichess_cloud_eval(fen, multipv=3)
    if cached:
        return cached

    # Fallback to local synchronous engine via threadpool
    loop = asyncio.get_running_loop()
    async with engine_semaphore:
        return await loop.run_in_executor(None, analyze_position, fen, depth)
