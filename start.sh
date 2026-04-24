#!/bin/bash
set -e

echo "♟️  Starting Shatranj..."

# ── Docker (Postgres + Redis) ─────────────────────────────────────────────────
echo "► Starting Docker containers (Postgres & Redis)..."
docker compose up -d

# ── Backend (FastAPI) ─────────────────────────────────────────────────────────
echo "► Starting backend..."
(
    cd backend

    # Create venv only if it doesn't exist yet
    if [ ! -d "venv" ]; then
        echo "  Creating Python virtual environment..."
        python -m venv venv
    fi

    # Activate — works on Windows (Git Bash) and Unix
    source venv/Scripts/activate 2>/dev/null || source venv/bin/activate

    # Install / sync dependencies
    pip install -q -r requirements.txt

    echo "  Backend ready → http://localhost:8000"
    python run.py
) &
BACKEND_PID=$!

# ── Frontend (Next.js) ────────────────────────────────────────────────────────
echo "► Starting frontend..."
(
    cd frontend

    # Install only when node_modules is missing
    if [ ! -d "node_modules" ]; then
        echo "  Installing npm dependencies..."
        npm install
    fi

    echo "  Frontend ready → http://localhost:3000"
    npm run dev
) &
FRONTEND_PID=$!

# ── Shutdown handler ──────────────────────────────────────────────────────────
cleanup() {
    echo ""
    echo "Shutting down..."
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
    docker compose stop
    exit 0
}
trap cleanup SIGINT SIGTERM

echo ""
echo "✓ All services running. Press Ctrl+C to stop."
echo "  Backend   → http://localhost:8000"
echo "  Frontend  → http://localhost:3000"
echo ""

wait
