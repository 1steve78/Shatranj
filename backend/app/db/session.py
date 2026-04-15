import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from app.db.base import Base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./chess.db")

engine = create_engine(
    DATABASE_URL,
    # Required for SQLite only — safe to keep for other DBs too
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Create all tables. Call once on startup."""
    # Import models so SQLAlchemy registers them before create_all
    from app.models import game, analysis, user  # noqa: F401
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency — yields a DB session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
