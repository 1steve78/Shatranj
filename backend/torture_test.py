import asyncio
import websockets
import json
import time

WS_URL = "ws://localhost:8000/analyze/stream"

# A dummy game of ~40 FENs (just repeating a few for the cache to pick up, and some unique ones)
dummy_fens = [
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    "rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
    "r1bqkbnr/pp1ppppp/2n5/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    "r1bqkbnr/pp1ppppp/2n5/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3"
] * 10 # Roughly 60 FENs per client

async def torture_client(client_id: int):
    print(f"Client {client_id} connecting...")
    try:
        async with websockets.connect(WS_URL) as ws:
            print(f"Client {client_id} connected. Sending {len(dummy_fens)} fens.")
            await ws.send(json.dumps({"fens": dummy_fens, "depth": 14}))
            
            # Optionally simulate a focus bump midway
            await asyncio.sleep(1)
            await ws.send(json.dumps({"type": "focus", "index": 50}))
            
            evals_received = 0
            start_time = time.time()
            
            while True:
                response = await ws.recv()
                data = json.loads(response)
                
                if data.get("type") == "eval":
                    evals_received += 1
                    if evals_received % 10 == 0:
                        print(f"  Client {client_id} received {evals_received}/{len(dummy_fens)} evals...")
                elif data.get("type") == "done":
                    end_time = time.time()
                    print(f"Client {client_id} DONE in {end_time - start_time:.2f}s!")
                    break
                elif data.get("type") == "error":
                    print(f"Client {client_id} ERROR: {data.get('message')}")
                    break
    except Exception as e:
        print(f"Client {client_id} failed: {e}")

async def main():
    print("--- STARTING CONCURRENCY TORTURE TEST ---")
    
    # 5 concurrent users
    clients = [torture_client(i) for i in range(1, 6)]
    await asyncio.gather(*clients)
    
    print("--- TORTURE TEST FINISHED ---")

if __name__ == "__main__":
    asyncio.run(main())
