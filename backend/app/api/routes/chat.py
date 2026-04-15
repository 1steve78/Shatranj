from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from app.services.ai_service import client, NIM_MODEL

router = APIRouter(prefix="/chat", tags=["Chat"])

class Message(BaseModel):
    role: str   # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    fen: str
    message: str
    history: Optional[List[Message]] = []

class ChatResponse(BaseModel):
    reply: str


SYSTEM_PROMPT = (
    "You are an expert chess coach. You help players understand their mistakes, "
    "improve their positional understanding, and explain chess concepts clearly. "
    "Keep answers concise but insightful. Use chess notation when relevant. "
    "The user will provide the current position as a FEN string in each message."
)


@router.post("", response_model=ChatResponse)
def chat(request: ChatRequest):
    """
    Stateless chat endpoint. The client sends the fen, current message, and conversation history.
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    
    if request.history:
        messages += [{"role": m.role, "content": m.content} for m in request.history]
        
    messages.append({
        "role": "user", 
        "content": f"[FEN: {request.fen}]\n\n{request.message}"
    })

    response = client.chat.completions.create(
        model=NIM_MODEL,
        messages=messages,
        max_tokens=300,
        temperature=0.7
    )

    return {"reply": response.choices[0].message.content.strip()}
