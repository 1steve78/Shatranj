from sqlalchemy import Column, Integer, Float, String, ForeignKey, Text
from app.db.base import Base


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False)

    move_number = Column(Integer, nullable=False)
    move = Column(String(10), nullable=False)        # UCI notation e.g. "e2e4"
    score = Column(Float, nullable=False)            # Engine eval in pawns
    best_move = Column(String(10), nullable=True)    # Best move suggested
    move_type = Column(String(20), nullable=False)   # blunder / mistake / inaccuracy / good
    explanation = Column(Text, nullable=True)        # AI-generated explanation
