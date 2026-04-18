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

import json

def explain_move(move: str, move_type: str, score: float, best_move: str, game_phase: str = "Midgame", previous_moves_context: str = "") -> dict:
    """
    Sends move data to Nvidia NIM and returns a structured JSON evaluation, simulating a 1200-level player comparison.
    """
    prompt = (
        f"You are a master chess coach analyzing a {game_phase} position. "
        f"The player played {move}, classified as a '{move_type}'. The engine favored {best_move}. "
        f"The engine evaluation is now {score:.2f} pawns."
        f"{previous_moves_context} \n"
        f"Your task is to return a strict JSON object with EXACTLY these four keys:\n"
        f"  \"tactical_explanation\": (string) Why the move is bad mathematically or tactically compared to {best_move}.\n"
        f"  \"skill_gap_simulation\": (string) What an average 1200 ELO player was likely thinking here.\n"
        f"  \"psychological_flaw\": (string) Why that intuition is flawed.\n"
        f"  \"internal_classification\": (string) Frame the error using advanced terminology (e.g., 'Tactical Collapse', 'Positional Drift', 'Endgame Precision Loss').\n"
        f"Do not include any markdown formatting or backticks around the output. Output raw valid JSON only."
    )

    try:
        response = client.chat.completions.create(
            model=NIM_MODEL,
            messages=[
                {"role": "system", "content": "You are a master chess coach focused on psychological skill gap visualization. Always respond in valid JSON format."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300,
            temperature=0.7,
            # We enforce JSON if the API supports it, though for compatibility we parse manually
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content.strip()
        # Clean up any potential markdown ticks if Llama ignores instructions
        if content.startswith("```json"):
            content = content.split("```json")[1].rsplit("```", 1)[0].strip()
        return json.loads(content)
    except Exception as e:
        return {
            "tactical_explanation": "Failed to analyze move.",
            "skill_gap_simulation": "N/A",
            "psychological_flaw": "N/A",
            "internal_classification": "Error"
        }


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
