# ♟️ Shatranj V2 "Stockfish on Espresso" (Chess Brain Factory)

Shatranj is a modern, high-performance web application designed for playing and analyzing chess. It bridges a sleek React-based UI with a powerful, brutally fast Python backend. The V2 upgrade implements an optimized **Stockfish Engine Pool**, **Redis caching**, and blazing-fast **WebSocket streaming** for real-time game analysis.

## 🚀 Tech Stack

### Frontend
* **Framework:** Next.js (React 19)
* **Styling:** Tailwind CSS V4
* **Chess Logic:** `chess.js`
* **Network:** Real-time WebSockets

### Backend
* **API:** FastAPI + Uvicorn
* **Database & Cache:** Postgres & Redis (via Docker Compose) / SQLite fallback
* **Chess Parsing:** `python-chess`
* **Engine Hookup:** Asynchronous Stockfish (Engine Pool)

---

## 🛠️ Getting Started

Follow these steps to set up the development environment successfully on your local machine.

### 1. Requirements
- Node.js (v18+)
- Python (3.10+)
- Docker & Docker Compose (Critical for Redis & DB)
- [Stockfish Executable](https://stockfishchess.org/download/)
- Nvidia NIM API Key (Available in the Nvidia Developer portal)

### 2. Infrastructure Setup
You must launch Redis before starting the backend so the caching layer works properly!

```bash
docker-compose up -d
```
*(This starts both PostgreSQL and Redis cache instances in the background)*

### 3. Backend Setup
Open a terminal and set up the Python environment:

```bash
cd backend
python -m venv venv
# On OSX/Linux use `source venv/bin/activate`
# On Windows use `venv\Scripts\activate`

# Install dependencies
pip install -r requirements.txt
```

**Configure Environment:**
Copy the example environment variables and edit them with your specific keys and paths:
```bash
cp .env.example .env
```
Inside `.env`, make sure to add your **Nvidia NIM API Key** and the absolute path to your downloaded **Stockfish executable**.

**Start the Server:**
```bash
uvicorn app.main:app --reload --port 8000
```
*(The backend will hook up to Redis and instantly spin up the 4-Engine Stockfish Pool)*

### 4. Frontend Setup
In a second terminal, configure and launch the Next.js application:

```bash
cd frontend
npm install
npm run dev
```

### 5. Play!
Visit `http://localhost:3000` in your browser. 
Import your PGNs, analyze positions, and use the integrated chat coach!

---

## 📁 Project Structure

```text
shatranj/
├── backend/                # Python FastAPI Backend
│   ├── app/                # Main application package
│   │   ├── api/            # API endpoints & WebSocket routes
│   │   ├── core/           # Configuration & environment variables
│   │   ├── db/             # Database connection & sessions
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── schemas/        # Pydantic schemas for data validation
│   │   ├── services/       # Business logic (Stockfish pool, LLM integration, Redis)
│   │   └── main.py         # FastAPI application entry point
│   ├── alembic/            # Database configurations & migration scripts
│   ├── tests/              # Pytest suite for backend testing
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile          # Docker configuration for the backend
│
├── frontend/               # Next.js React Frontend
│   ├── app/                # Next.js App Router (Pages, Layouts & API Routes)
│   ├── components/         # Reusable UI components (Chessboard, Analyisis Panel)
│   ├── hooks/              # Custom React hooks (e.g., useAnalysis, useWebSocket)
│   ├── lib/                # Utility functions and shared logic
│   ├── public/             # Static assets (images, icons)
│   ├── styles/             # Global CSS and Tailwind definitions
│   └── package.json        # Node.js dependencies and scripts
│
├── docker-compose.yml      # Orchestrates external services (PostgreSQL, Redis)
├── start.bat               # Windows startup script to run all services locally
└── start.sh                # Linux/Mac startup script to run all services locally
```

---

## 🏗️ Architecture V2

The analysis pipeline was completely rebuilt in V2 to focus on speed, stability, and simplicity. It operates in two clean steps:

1. **Import (`POST /games/import`)**: 
   The frontend sends a PGN string. The backend uses `python-chess` to play through the game, extracting the exact FEN position for every move and reading PGN headers (to correctly handle custom `initialFen`s). No heavy processing happens here.
2. **Analysis (`WS /analyze/stream`)**: 
   The frontend opens a WebSocket and sends the entire array of FENs. The backend distributes these FENs across an asynchronous, 4-worker Stockfish pool via a fast FIFO queue. 
   - **Caching:** Every position is hashed using a Zobrist hash and checked against the Redis cache.
   - **Streaming:** As soon as an engine finishes evaluating a position (or a cache hit occurs), the result (Evaluation, Mate, Best Move, PV Lines, Depth) is immediately streamed back to the frontend.
   - **UI:** The Next.js frontend catches these packets and updates the evaluation bar and move list incrementally without blocking the UI thread.
