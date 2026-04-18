import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Using Nvidia NIM's OpenAI-compatible endpoint
client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.getenv("NVIDIA_API_KEY")
)

# Default to a powerful instruct model hosted by Nvidia NIM
NIM_MODEL = "meta/llama-3.1-70b-instruct"

def explain_move(move: str, move_type: str, score: float, best_move: str, game_phase: str = "Midgame", previous_moves_context: str = "") -> str:
    """
    Sends move data to Nvidia NIM and returns a human-readable explanation, simulating a 1200-level player comparison.
    """
    prompt = (
        f"You are a master chess coach analyzing a {game_phase} position. "
        f"The player played {move}, classified as a '{move_type}'. The engine favored {best_move}. "
        f"The engine evaluation is now {score:.2f} pawns."
        f"{previous_moves_context} \n"
        f"Your task:\n"
        f"1. Explain why {move} is a {move_type} mathematically or tactically using the engine's preferred move.\n"
        f"2. Simulate a '1200-rated player': What would an average 1200 ELO player think here, and why is that intuition flawed compared to the engine?\n"
        f"3. Frame the error using advanced internal terminology where appropriate (e.g., 'Tactical Collapse', 'Positional Drift' for sequential inaccuracies, or 'Endgame Precision Loss').\n"
        f"Be concise, clear, and write it in a punchy, coaching tone."
    )

    response = client.chat.completions.create(
        model=NIM_MODEL,
        messages=[
            {"role": "system", "content": "You are a master chess coach sitting next to the player, focused on psychological skill gap visualization."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=200,
        temperature=0.7
    )

    return response.choices[0].message.content.strip()


def explain_game_summary(results: list) -> str:
    """
    Sends full game analysis to Nvidia NIM and returns an overall game summary.
    """
    blunders = sum(1 for r in results if r["type"] == "blunder")
    mistakes = sum(1 for r in results if r["type"] == "mistake")
    inaccuracies = sum(1 for r in results if r["type"] == "inaccuracy")
    good_moves = sum(1 for r in results if r["type"] == "good")

    prompt = (
        f"You are a chess coach summarizing a game. "
        f"The player made {blunders} blunder(s), {mistakes} mistake(s), "
        f"{inaccuracies} inaccuracy/inaccuracies, and {good_moves} good move(s). "
        f"Write a short 3-4 sentence overall assessment of the player's performance "
        f"and one key piece of advice for improvement."
    )

    response = client.chat.completions.create(
        model=NIM_MODEL,
        messages=[
            {"role": "system", "content": "You are a helpful chess coach assistant."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=200,
        temperature=0.7
    )

    return response.choices[0].message.content.strip()
