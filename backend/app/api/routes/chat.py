from fastapi import APIRouter
from pydantic import BaseModel
from app.services.ai_service import client

router = APIRouter(prefix="/chat", tags=["Chat"])

# In-memory conversation history per session (stateless — client sends full history)
class Message(BaseModel):
    role: str   # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: list[Message]

class ChatResponse(BaseModel):
    reply: str


SYSTEM_PROMPT = (
    "You are an expert chess coach. You help players understand their mistakes, "
    "improve their positional understanding, and explain chess concepts clearly. "
    "Keep answers concise but insightful. Use chess notation when relevant."
)


@router.post("", response_model=ChatResponse)
def chat(request: ChatRequest):
    """
    Stateless chat endpoint. The client sends the full conversation history
    and receives the assistant's next reply.
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages += [{"role": m.role, "content": m.content} for m in request.messages]

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        max_tokens=300,
        temperature=0.7
    )

    return {"reply": response.choices[0].message.content.strip()}
