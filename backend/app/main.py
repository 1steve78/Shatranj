from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.api.routes.analyze import router as analyze_router
from app.api.routes.game import router as game_router
from app.api.routes.chat import router as chat_router
from app.db.session import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create DB tables
    init_db()
    yield
    # Shutdown: nothing to clean up for now


app = FastAPI(
    title="Chess Analyzer API",
    description="Stockfish-powered chess game analysis with AI coaching.",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(analyze_router)
app.include_router(game_router)
app.include_router(chat_router)


@app.get("/health")
def health():
    return {"status": "ok"}
