from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api.routes.analyze import router as analyze_router
from app.api.routes.game import router as game_router
from app.api.routes.chat import router as chat_router
from app.api.routes.opening import router as opening_router
from app.db.session import init_db
from app.services.engine_service import close_engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create DB tables
    init_db()
    
    # Warm up engine pool eagerly
    from app.services.engine_service import engine_pool
    await engine_pool.initialize()
    
    yield
    await close_engine()


app = FastAPI(
    title="Chess Analyzer API",
    description="Stockfish-powered chess game analysis with AI coaching.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router)
app.include_router(game_router)
app.include_router(chat_router)
app.include_router(opening_router)


@app.get("/health")
def health():
    return {"status": "ok"}
