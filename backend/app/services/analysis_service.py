import math
import chess

def calculate_cp_loss(prev_score, new_score, is_white_turn):
    # Scores are from White's perspective. 
    # If White played, loss = prev - new (since positive is good for white)
    # If Black played, loss = new - prev (since negative is good for black)
    
    # If mate is involved, handle cleanly
    if prev_score > 50000 and new_score > 50000:
        return 0 # Still winning mate
    if prev_score < -50000 and new_score < -50000:
        return 0 # Still losing mate
        
    diff = prev_score - new_score if is_white_turn else new_score - prev_score
    return max(0, diff) # Never negative CP loss

def classify_move(cp_loss, prev_score, new_score, is_white_turn, is_best_move=False, is_sacrifice=False):
    # Missed win: Was previously winning >300, now dropped below <100
    prev_eval_for_player = prev_score if is_white_turn else -prev_score
    new_eval_for_player = new_score if is_white_turn else -new_score
    
    if prev_eval_for_player > 300 and new_eval_for_player < 100:
        return "miss"

    if is_sacrifice and cp_loss < 20 and is_best_move:
        return "brilliant"
    if cp_loss <= 5:
        return "best" if is_best_move else "great"
    if cp_loss <= 25:
        return "good"
    if cp_loss <= 100:
        return "inaccuracy"
    if cp_loss <= 300:
        return "mistake"
    return "blunder"

def estimate_elo_performance(accuracy, player_elo=1200):
    # A simple linear/exponential Bayesian anchor mapping
    # 100% accuracy -> +600 ELO performance above default rating
    # 50% accuracy -> -400 ELO performance
    rating_modifier = ((accuracy / 100.0) - 0.70) * 1200
    perf = player_elo + rating_modifier
    return max(100, int(perf))

def extract_tactical_motifs(board, move_str):
    motifs = []
    try:
        move = chess.Move.from_uci(move_str)
        if board.is_capture(move):
            motifs.append("Capture")
        if board.gives_check(move):
            motifs.append("Check")
        # Simulating the move
        board.push(move)
        if board.is_checkmate():
            motifs.append("Checkmate")
        board.pop()
    except Exception:
        pass
    
    return motifs

def calculate_accuracy(avg_cp_loss):
    # Approximation of CAPS formula
    acc = 103.1668 * math.exp(-0.04354 * avg_cp_loss) - 3.1669
    return max(0.0, min(100.0, acc))
    
def get_game_phase(move_num, board):
    if move_num <= 10:
        return "Opening"
    
    # Count pieces (rough endgame heuristic)
    piece_count = len(board.piece_map())
    if piece_count <= 12:
        return "Endgame"
        
    return "Midgame"