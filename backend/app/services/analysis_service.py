def classify_move(prev_score, new_score):
    diff = prev_score - new_score

    if diff > 300:
        return "blunder"
    elif diff > 100:
        return "mistake"
    elif diff > 50:
        return "inaccuracy"
    else:
        return "good"