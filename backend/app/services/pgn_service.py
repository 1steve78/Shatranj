import chess.pgn
import io

def parse_pgn(pgn_text: str):
    game = chess.pgn.read_game(io.StringIO(pgn_text))
    board = game.board()

    positions = []

    for move in game.mainline_moves():
        before_fen = board.fen()
        board.push(move)
        positions.append({
            "before_fen": before_fen,
            "fen": board.fen(),
            "move": move.uci()
        })

    return positions

def parse_pgn_detailed(pgn_text: str):
    game = chess.pgn.read_game(io.StringIO(pgn_text))
    if not game:
        raise ValueError("Invalid PGN")
    
    board = game.board()
    moves = []
    
    for move in game.mainline_moves():
        san = board.san(move)
        board.push(move)
        moves.append({
            "san": san,
            "fen": board.fen()
        })
        
    return {
        "initialFen": game.board().fen(),
        "headers": dict(game.headers),
        "moves": moves
    }
