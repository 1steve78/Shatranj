# T09: Sub-100ms hash hit
# T10: Poisoning guard (shallower depth overwrite prevention)

import pytest
import asyncio
import time
from app.services.engine_service import analyze_position_async
from app.services.redis_service import get_cached_eval, set_cached_eval
import chess

@pytest.mark.asyncio
async def test_t09_sub_100ms_hash_hit():
    # Evaluate a position to cache it
    fen = "r1bqk2r/pp2bppp/2n1pn2/2p5/3pP3/3P1NN1/PPP2PPP/R1BQKB1R w KQkq - 2 8"
    
    # First pass: normal eval
    result1 = await analyze_position_async(fen, depth=10)
    
    # Second pass: should hit cache
    start = time.time()
    result2 = await analyze_position_async(fen, depth=10)
    end = time.time()
    
    assert end - start < 0.1 # Less than 100ms to pull from Redis
    assert result1["score"] == result2["score"]

@pytest.mark.asyncio
async def test_t10_poisoning_guard():
    # Set a high-quality (depth 20) evaluation manually
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    board = chess.Board(fen)
    zobrist = board.zobrist_hash()
    
    high_quality_data = {
        "depth": 20,
        "score": 45,
        "mate": None,
        "best_move": "e2e4",
        "pv_lines": ["e2e4 e7e5"],
        "best_move_arrows": []
    }
    
    # Explicitly cache the high quality eval
    await set_cached_eval(zobrist, high_quality_data, ttl=300)
    
    # Now simulate an engine returning depth 10. The set_cached_eval should reject it.
    low_quality_data = {
        "depth": 10,
        "score": 30, # Differing score
        "mate": None,
        "best_move": "d2d4",
        "pv_lines": [],
        "best_move_arrows": []
    }
    
    await set_cached_eval(zobrist, low_quality_data, ttl=300)
    
    # Retrieve it, it should still be the depth 20 result
    cached = await get_cached_eval(zobrist, minimum_depth=10)
    assert cached is not None
    assert cached["depth"] == 20
    assert cached["score"] == 45
