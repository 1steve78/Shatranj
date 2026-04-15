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
NIM_MODEL = "meta/llama3-70b-instruct"

def explain_move(move: str, move_type: str, score: float, best_move: str) -> str:
    """
    Sends move data to Nvidia NIM and returns a human-readable explanation.
    """
    prompt = (
        f"You are a chess coach. A player played the move {move}, "
        f"which is classified as a '{move_type}'. "
        f"The engine evaluation after this move is {score:.2f} pawns (from White's perspective). "
        f"The best move was {best_move}. "
        f"In 2-3 sentences, explain why this move is a {move_type} and what the player should have done instead. "
        f"Be concise, clear, and instructive."
    )

    response = client.chat.completions.create(
        model=NIM_MODEL,
        messages=[
            {"role": "system", "content": "You are a helpful chess coach assistant."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=150,
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
