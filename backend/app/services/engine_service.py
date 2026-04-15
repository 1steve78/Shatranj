import os
import chess
import chess.engine
from dotenv import load_dotenv

load_dotenv()

STOCKFISH_PATH = os.getenv("STOCKFISH_PATH")

if not STOCKFISH_PATH:
    raise ValueError("STOCKFISH_PATH is not set")

engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)


def analyze_position(fen: str):
    board = chess.Board(fen)

    # 🔥 Single call (faster + cleaner)
    info = engine.analyse(board, chess.engine.Limit(depth=15))

    score = info["score"].white().score(mate_score=10000)

    best_move = None
    if "pv" in info and len(info["pv"]) > 0:
        best_move = info["pv"][0].uci()

    return {
        "score": score / 100 if score is not None else 0,
        "best_move": best_move
    }