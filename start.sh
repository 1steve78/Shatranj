#!/bin/bash

echo "♟️ Starting Shatranj..."

echo "Starting Docker containers (Postgres & Redis)..."
docker compose up -d

# Start backend in background
echo "Starting Backend Server (FastAPI)..."
(cd backend && source venv/Scripts/activate 2>/dev/null || true && uvicorn app.main:app --reload --port 8000) &
BACKEND_PID=$!

# Start frontend in background
echo "Starting Frontend Server (Next.js)..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

# Wait for Ctrl+C to kill both processes
trap "echo 'Shutting down servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT

echo "Servers are running! Press Ctrl+C to stop."
wait
