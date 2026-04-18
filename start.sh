#!/bin/bash

echo "♟️ Starting Shatranj..."

echo "Starting Docker containers (Postgres & Redis)..."
docker compose up -d

# Check Python environment and install dependencies before starting the backend
echo "Starting Backend Server (FastAPI) and installing dependencies..."
(
    cd backend
    if [ ! -d "venv" ]; then
        python -m venv venv
    fi
    # Support both Windows git-bash and Unix
    source venv/Scripts/activate 2>/dev/null || source venv/bin/activate 2>/dev/null
    python -m pip install -r requirements.txt
    python run.py
) &
BACKEND_PID=$!

# Install npm dependencies and start frontend
echo "Starting Frontend Server (Next.js) and installing dependencies..."
(
    cd frontend
    npm install
    npm run dev
) &
FRONTEND_PID=$!

# Wait for Ctrl+C to kill both processes
trap "echo 'Shutting down servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT

echo "Servers are running! Press Ctrl+C to stop."
wait
