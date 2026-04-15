from dataclasses import dataclass


@dataclass
class MoveClassification:
    label: str       # blunder / mistake / inaccuracy / good / excellent / best
    emoji: str
    score_diff: float


def classify_move_detailed(prev_score: float, new_score: float) -> MoveClassification:
    """
    Extended classification with more granularity than analysis_service.py.
    Score difference is always from the perspective of the side that just moved.
    """
    diff = prev_score - new_score   # positive = player lost advantage

    if diff > 300:
        return MoveClassification("blunder", "💀", diff)
    elif diff > 100:
        return MoveClassification("mistake", "😬", diff)
    elif diff > 50:
        return MoveClassification("inaccuracy", "😕", diff)
    elif diff > -10:
        return MoveClassification("good", "✅", diff)
    else:
        # Player actually improved beyond the best expected line
        return MoveClassification("excellent", "💯", diff)


def compute_accuracy(move_results: list[dict]) -> float:
    """
    Returns a simple accuracy percentage for the game (0–100).
    Penalizes blunders heavily, mistakes moderately, inaccuracies lightly.
    """
    if not move_results:
        return 0.0

    penalties = {"blunder": 3, "mistake": 1.5, "inaccuracy": 0.5, "good": 0, "excellent": 0}
    total_penalty = sum(penalties.get(r["type"], 0) for r in move_results)
    max_penalty = len(move_results) * 3   # worst case: all blunders

    raw_accuracy = 1 - (total_penalty / max_penalty)
    return round(max(0.0, raw_accuracy) * 100, 1)
