import math
import chess

def calculate_cp_loss(prev_score, prev_mate, new_score, new_mate, is_white_turn):
    # Scores are from White's perspective. 
    if prev_mate is not None or new_mate is not None:
        # If maintaining a winning mate, no loss
        if prev_mate is not None and new_mate is not None and ((prev_mate > 0) == (new_mate > 0)):
            return 0
        # If mate status changed, penalize heavily as a blunder (unless they blundered mate to us, caught by max 0)
        diff = prev_score - new_score if is_white_turn else new_score - prev_score
        return max(0, diff)
        
    diff = prev_score - new_score if is_white_turn else new_score - prev_score
    return max(0, diff) # Never negative CP loss

def calculate_move_accuracy(cp_loss: float) -> float:
    """
    Calculates move accuracy based on Centipawn (CP) loss using a Sigmoid curve.
    """
    accuracy = 100 * math.exp(-0.004 * cp_loss)
    return round(accuracy, 2)

def classify_move(cp_loss, prev_score, new_score, is_white_turn, is_best_move=False, is_sacrifice=False):
    accuracy = calculate_move_accuracy(cp_loss)
    
    # Brilliant: cp_loss < 10 and is a sacrifice OR accuracy > 98 in critical pos
    if (cp_loss < 10 and is_sacrifice) or (accuracy > 98 and is_sacrifice):
        return "brilliant"
        
    # Great Move: accuracy > 95 and it was the only move that didn't result in a disadvantage
    # We use accuracy > 95 and best move as approximation
    if accuracy > 95 and is_best_move and cp_loss > 0:
        return "great"
        
    if is_best_move or cp_loss == 0:
        return "best"
        
    if accuracy >= 80:
        return "good"
        
    if accuracy >= 60:
        return "inaccuracy"
        
    if accuracy >= 30:
        eval_before_move = prev_score if is_white_turn else -prev_score
        if eval_before_move >= 300 and cp_loss > 200:
            return "miss"
        return "mistake"
        
    eval_before_move = prev_score if is_white_turn else -prev_score
    if eval_before_move >= 300 and cp_loss > 200:
        return "miss"
        
    return "blunder"

def estimate_elo_performance(accuracy, player_elo=1200):
    # A simple linear/exponential Bayesian anchor mapping
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

def calculate_accuracy(move_accuracies):
    if not move_accuracies:
        return 0.0
    return round(sum(move_accuracies) / len(move_accuracies), 1)
    
def get_game_phase(move_num, board):
    if move_num <= 10:
        return "Opening"
    
    # Count pieces (rough endgame heuristic)
    piece_count = len(board.piece_map())
    if piece_count <= 12:
        return "Endgame"
        
    return "Midgame"