import chess
import chess.pgn
import io


def parse_pgn_detailed(pgn_text: str) -> dict:
    """
    Parse a PGN string into a structured dict of moves and headers.
    Returns { initialFen, headers, moves: [{ san, fen, moveNumber }] }
    """
    game = chess.pgn.read_game(io.StringIO(pgn_text))
    if not game:
        raise ValueError("Invalid PGN")

    # Honour the [FEN "..."] header for games that don't start from the
    # initial position (e.g. puzzles, handicap games, etc.)
    initial_fen = game.headers.get("FEN", chess.STARTING_FEN)
    board = game.board()  # respects the SetUp/FEN headers automatically

    moves = []
    half_move = 0
    for move in game.mainline_moves():
        san = board.san(move)
        board.push(move)
        half_move += 1
        moves.append({
            "san": san,
            "fen": board.fen(),
            "moveNumber": half_move,
        })

    return {
        "initialFen": initial_fen,
        "headers": dict(game.headers),
        "moves": moves,
    }
