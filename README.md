# ♟️ Shatranj V2 "Stockfish on Espresso" (Chess Brain Factory)

Shatranj is a modern, high-performance web application designed for playing and analyzing chess. It bridges a sleek React-based UI with a powerful, brutally fast Python backend. The V2 upgrade implements an adaptive **4-engine Stockfish Swarm**, **Redis Zobrist caching**, and a **1200-ELO LLM Skill Gap Coach** powered by Nvidia NIM.

## 🚀 Tech Stack

### Frontend
* **Framework:** Next.js (React 19)
* **Styling:** Tailwind CSS V4
* **Chess Logic:** `chess.js`
* **Network:** Axios + Real-time WebSockets

### Backend
* **API:** FastAPI + Uvicorn
* **Database & Cache:** Postgres & Redis (via Docker Compose) / SQLite fallback
* **Chess Parsing:** `python-chess`
* **Engine Hookup:** Asynchronous Stockfish (Engine Pool)
* **AI Integration:** Nvidia NIM (`meta/llama-3.1-70b-instruct`)

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

- `/games/import`: Converts raw PGN strings into a series of FEN positions, while triggering a silent **Speculative Precalculation** job in a BackgroundTask for blazing-fast initial UX.
- `/analyze/stream`: An advanced priority-driven WebSocket. It connects to the **Zobrist Redis cache** first. If missed, it routes the evaluation to an asynchronous pool of 4 Stockfish instances, governed by adaptive depth heuristics (`12` vs `14` vs `18` depending on tactical spikes).
- `/analyze/game`: Groups evaluations chronologically to detect sequences (like "Positional Drift") and passes them to Llama 3.1 70b. The Coach simulates a 1200-ELO player's intuition to pinpoint your psychological skill gap.
