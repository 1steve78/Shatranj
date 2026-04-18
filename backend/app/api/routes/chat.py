from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional
from app.services.ai_service import client, NIM_MODEL
import json
import re

router = APIRouter(prefix="/chat", tags=["Chat"])

class Message(BaseModel):
    role: str   # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    fen: str
    message: str
    history: Optional[List[Message]] = Field(default_factory=list)

class ChatResponse(BaseModel):
    reply: str

class MoveInsightInput(BaseModel):
    moveIndex: int
    san: str
    fen: str
    evaluation: Optional[float] = None
    mate: Optional[int] = None
    bestMove: Optional[str] = None

class PgnInsightsRequest(BaseModel):
    pgn: str
    moves: List[MoveInsightInput]

class MoveInsight(BaseModel):
    moveIndex: int
    text: str

class PgnInsightsResponse(BaseModel):
    insights: List[MoveInsight]


SYSTEM_PROMPT = (
    "You are an expert chess coach. You help players understand their mistakes, "
    "improve their positional understanding, and explain chess concepts clearly. "
    "Keep answers concise but insightful. Use chess notation when relevant. "
    "The user will provide the current position as a FEN string in each message."
)


def build_messages(request: ChatRequest):
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    if request.history:
        messages += [{"role": m.role, "content": m.content} for m in request.history]

    messages.append({
        "role": "user",
        "content": f"[FEN: {request.fen}]\n\n{request.message}"
    })

    return messages


def parse_json_object(content: str) -> dict:
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if not match:
            raise
        return json.loads(match.group(0))


@router.post("", response_model=ChatResponse)
def chat(request: ChatRequest):
    """
    Stateless chat endpoint. The client sends the fen, current message, and conversation history.
    """
    response = client.chat.completions.create(
        model=NIM_MODEL,
        messages=build_messages(request),
        max_tokens=300,
        temperature=0.7
    )

    return {"reply": response.choices[0].message.content.strip()}


@router.post("/pgn-insights", response_model=PgnInsightsResponse)
def pgn_insights(request: PgnInsightsRequest):
    move_lines = []
    for move in request.moves:
        eval_text = "mate " + str(move.mate) if move.mate is not None else f"{move.evaluation:.2f}" if move.evaluation is not None else "unknown"
        best_text = move.bestMove or "unknown"
        move_lines.append(
            f"{move.moveIndex}. {move.san} | eval: {eval_text} | best: {best_text} | fen: {move.fen}"
        )

    prompt = (
        "You are a concise chess coach. The full PGN and per-move engine context are below.\n"
        "Write exactly one short, useful sentence for every moveIndex. Keep each sentence under 18 words.\n"
        "Mention the move idea, mistake, threat, or best practical plan. Do not use markdown.\n"
        "Return only valid JSON in this shape: {\"insights\":[{\"moveIndex\":1,\"text\":\"...\"}]}.\n\n"
        f"PGN:\n{request.pgn}\n\n"
        "Moves:\n" + "\n".join(move_lines)
    )

    response = client.chat.completions.create(
        model=NIM_MODEL,
        messages=[
            {"role": "system", "content": "You return compact chess coaching notes as strict JSON only."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=min(3500, max(500, len(request.moves) * 32)),
        temperature=0.3
    )

    content = response.choices[0].message.content.strip()
    parsed = parse_json_object(content)
    raw_insights = parsed.get("insights", [])
    requested_indices = {move.moveIndex for move in request.moves}

    insights = []
    for item in raw_insights:
        try:
            move_index = int(item.get("moveIndex"))
            text = str(item.get("text", "")).strip()
        except (TypeError, ValueError):
            continue

        if move_index in requested_indices and text:
            insights.append({"moveIndex": move_index, "text": text})

    return {"insights": insights}


@router.post("/stream")
def stream_chat(request: ChatRequest):
    def generate():
        stream = client.chat.completions.create(
            model=NIM_MODEL,
            messages=build_messages(request),
            max_tokens=300,
            temperature=0.7,
            stream=True,
        )

        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    return StreamingResponse(generate(), media_type="text/plain")
