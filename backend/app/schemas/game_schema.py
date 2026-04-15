from pydantic import BaseModel


class GameCreate(BaseModel):
    pgn: str


class GameOut(BaseModel):
    id: int
    pgn: str

    model_config = {"from_attributes": True}
