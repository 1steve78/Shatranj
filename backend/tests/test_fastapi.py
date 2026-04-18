# T04: Exotic PGN parsing
# T05: 20-client concurrent storm

import pytest
import asyncio
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_t04_exotic_pgn_parsing():
    # PGN with no headers, comments, and recursive variations
    exotic_pgn = """
    1. e4 {[%clk 0:03:00]} e5 2. Nf3 (2. f4 exf4) 2... Nc6 *
    """
    response = client.post("/games/import", json={"pgn": exotic_pgn, "fen": ""})
    assert response.status_code == 200
    data = response.json()
    assert len(data["moves"]) > 0
    assert data["moves"][0]["san"] == "e4"

@pytest.mark.asyncio
async def test_t05_concurrent_storm():
    # 20 clients concurrently asking for analyze_single_position
    import httpx
    
    async with httpx.AsyncClient(app=app, base_url="http://test") as ac:
        tasks = []
        for i in range(20):
            req = ac.post("/analyze", json={
                "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                "depth": 10
            })
            tasks.append(req)
        
        responses = await asyncio.gather(*tasks)
        
        assert len(responses) == 20
        for r in responses:
            assert r.status_code == 200
            assert "evaluation" in r.json()
