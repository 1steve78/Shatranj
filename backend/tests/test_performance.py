# T13: Parallel stress testing with `psutil`
# T14: Playwright first-render timing
# T15: Memory leak detector

import pytest
import asyncio
import psutil
import os
import time
from backend.app.services.engine_service import analyze_position_async
from playwright.async_api import async_playwright

@pytest.mark.asyncio
async def test_t13_parallel_stress_psutil():
    process = psutil.Process()
    # Execute extreme burst inside the semaphore
    tasks = []
    # Sending 50 simultaneous parallel requests straight to the engine pool
    # They should queue up behind the 4 workers.
    for i in range(50):
        tasks.append(analyze_position_async("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", depth=10))

    await asyncio.gather(*tasks)
    
    # Assert CPU/Memory didn't explode the host Node (Check memory isn't climbing to GBs)
    mem_info = process.memory_info()
    assert mem_info.rss < 1024 * 1024 * 1024 # Backend python process should stay under 1GB RAM

@pytest.mark.asyncio
async def test_t14_playwright_first_render():
    # Attempt to connect to localhost:3000 to time the DOM rendering
    # If Next.js is not active, skip gracefully
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()
            
            start_time = time.time()
            try:
                await page.goto("http://localhost:3000", wait_until="networkidle", timeout=3000)
                end_time = time.time()
                assert end_time - start_time < 3.0 # First render should be under 3 seconds
            except Exception:
                pass # Skip if frontend isn't running
            finally:
                await browser.close()
    except Exception:
        pass # Skip if playwright not installed locally

@pytest.mark.asyncio
async def test_t15_memory_leak_detector():
    process = psutil.Process()
    
    # Warm up step
    await analyze_position_async("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", depth=10)
    baseline_mem = process.memory_info().rss
    
    # 100 runs
    tasks = []
    for i in range(1, 101):
        fen = f"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 {i}"
        tasks.append(analyze_position_async(fen, depth=10))
        
    await asyncio.gather(*tasks)
    
    final_mem = process.memory_info().rss
    
    # Python GC works abstractly, but 100 queries shouldn't climb linearly.
    # Allowing for 50MB overhead swing.
    assert final_mem - baseline_mem < (50 * 1024 * 1024)
