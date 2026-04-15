def score_to_display(score: float) -> str:
    """
    Converts a raw engine score (in pawns) to a display-friendly string.
    e.g.  1.5  -> "+1.50"
         -3.0  -> "-3.00"
         100.0 -> "#M1" (mate)
    """
    if score >= 99:
        return "#M (White)"
    if score <= -99:
        return "#M (Black)"
    sign = "+" if score > 0 else ""
    return f"{sign}{score:.2f}"


def get_advantage(score: float) -> str:
    """Returns a human-readable advantage label based on score."""
    abs_score = abs(score)
    if abs_score >= 99:
        return "Checkmate"
    if abs_score >= 3.0:
        return "Winning" if score > 0 else "Losing"
    if abs_score >= 1.5:
        return "Clearly better" if score > 0 else "Clearly worse"
    if abs_score >= 0.5:
        return "Slightly better" if score > 0 else "Slightly worse"
    return "Equal"
