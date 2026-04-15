import chess.pgn
import io

def parse_pgn(pgn_text: str):
    game = chess.pgn.read_game(io.StringIO(pgn_text))
    board = game.board()

    positions = []

    for move in game.mainline_moves():
        board.push(move)
        positions.append({
            "fen": board.fen(),
            "move": move.uci()
        })

    return positions