import os
import chess
import chess.engine
from dotenv import load_dotenv

load_dotenv()

STOCKFISH_PATH = os.getenv("STOCKFISH_PATH")

if not STOCKFISH_PATH:
    raise ValueError("STOCKFISH_PATH is not set")

engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)


def analyze_position(fen: str, depth: int = 15):
    board = chess.Board(fen)

    # 🔥 Single call (faster + cleaner)
    info = engine.analyse(board, chess.engine.Limit(depth=depth))

    pov_score = info["score"].white()
    score = pov_score.score()
    mate = pov_score.mate()

    best_move = None
    if "pv" in info and len(info["pv"]) > 0:
        best_move = info["pv"][0].uci()

    evaluation = score / 100 if score is not None else 0

    return {
        "score": evaluation,
        "evaluation": evaluation,
        "mate": mate,
        "depth": depth,
        "best_move": best_move
    }