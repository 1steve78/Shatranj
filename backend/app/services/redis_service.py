import json
import logging
from typing import Optional, Dict, Any
import chess
import redis.asyncio as redis

logger = logging.getLogger(__name__)

# TTLs defined by user
TTL_OPENING = 7 * 24 * 60 * 60  # 7 days
TTL_MIDDLEGAME = 24 * 60 * 60   # 24 hours
TTL_ENDGAME = None              # Forever

# Global connection pool
redis_client: Optional[redis.Redis] = None

def get_redis() -> redis.Redis:
    global redis_client
    if redis_client is None:
        # Connect to the local Redis container running on port 6379, db=0
        redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    return redis_client

def get_zobrist_hash(fen: str) -> int:
    """Generate Zobrist hash using python-chess to treat transpositions equally."""
    try:
        board = chess.Board(fen)
        return board.zobrist_hash()
    except Exception:
        # Fallback if invalid FEN
        return hash(fen)

def determine_ttl(fen: str) -> Optional[int]:
    """Determine smart TTL based on phase of the game."""
    try:
        board = chess.Board(fen)
        pieces_count = len(board.piece_map())
        if pieces_count > 28:
            return TTL_OPENING
        elif pieces_count > 12:
            return TTL_MIDDLEGAME
        else:
            return TTL_ENDGAME
    except Exception:
        return TTL_MIDDLEGAME

async def get_cached_eval(fen: str) -> Optional[Dict[str, Any]]:
    """Retrieve an evaluation from Redis based on Zobrist hash."""
    client = get_redis()
    z_hash = get_zobrist_hash(fen)
    key = f"eval:{z_hash}"
    try:
        data = await client.get(key)
        if data:
            return json.loads(data)
    except Exception as e:
        logger.warning(f"Failed to read from Redis cache: {e}")
    return None

async def set_cached_eval(fen: str, result: Dict[str, Any]) -> None:
    """Store an evaluation in Redis, with cache poisoning protection."""
    client = get_redis()
    z_hash = get_zobrist_hash(fen)
    key = f"eval:{z_hash}"
    ttl = determine_ttl(fen)
    
    try:
        # Cache poisoning defense (only overwrite if depth is >= cached depth)
        existing_data = await client.get(key)
        if existing_data:
            existing = json.loads(existing_data)
            existing_depth = existing.get("depth", 0)
            new_depth = result.get("depth", 0)
            if new_depth < existing_depth:
                return  # Do not overwrite a deeper evaluation with a shallower one

        await client.set(key, json.dumps(result), ex=ttl)
    except Exception as e:
        logger.warning(f"Failed to write to Redis cache: {e}")
