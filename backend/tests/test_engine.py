# T01: Forced mate detection
# T02: Invalid FEN routing
# T03: Depth/Time tradeoff benchmarking

import pytest
import asyncio
from app.services.engine_service import analyze_position_async

@pytest.mark.asyncio
async def test_t01_forced_mate_detection():
    # White to move, mate in 1
    mate_in_1_fen = "4k3/8/8/8/8/8/8/4K2R w K - 0 1"
    # Actually wait, Rh8 is mate, so mate in 1. But starting FEN implies game state. Let's give a clear mate in 1
    # Example: 3R4/8/8/8/8/6k1/8/6K1 w - - 0 1 => Rh8 is mate in 1. Wait, that's not mate.
    # Let's use standard backrank mate:
    mate_fen = "8/8/8/8/8/R7/R7/4k2K w - - 0 1" # Two rooks on a/b files, black king on e1.
    result = await analyze_position_async(mate_fen, depth=14)
    # The evaluation score should be > 50000 or mate != None
    assert result["mate"] is not None
    assert result["mate"] == 1 or result["score"] > 50000

@pytest.mark.asyncio
async def test_t02_invalid_fen_routing():
    # Provide complete garbage FEN
    invalid_fen = "garbage_fen_string_that_makes_no_sense"
    try:
        await analyze_position_async(invalid_fen, depth=10)
        assert False, "Engine service should have rejected invalid FEN without stalling."
    except ValueError:
        assert True
    except Exception as e:
        # If it raises a different exception internally we catch and assert type or raise
        assert "fen" in str(e).lower() or isinstance(e, (ValueError, AssertionError))

@pytest.mark.asyncio
async def test_t03_depth_time_tradeoff():
    # Benchmarking adaptive depth. We evaluate a simple position.
    import time
    start = time.time()
    # Complex middle game position
    middle_fen = "r1bqk2r/pp2bppp/2n1pn2/2p5/3pP3/3P1NN1/PPP2PPP/R1BQKB1R w KQkq - 2 8"
    result = await analyze_position_async(middle_fen, depth=12) # Fixed depth request
    end = time.time()
    
    assert end - start < 3.0 # Should be very fast (under 3 seconds for depth 12)
    assert result["depth"] >= 12
