from sqlalchemy import Column, Integer, Text
from app.models.base import Base

class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    pgn = Column(Text)