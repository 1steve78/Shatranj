@echo off
echo ♟️ Starting Shatranj...

REM Start Docker containers
echo Starting Docker containers (Postgres ^& Redis)...
docker compose up -d

REM Start Backend in a new window
echo Starting Backend Server (FastAPI)...
start "Shatranj Backend" cmd /k "cd backend && (if not exist venv python -m venv venv) && (call venv\Scripts\activate.bat) && python -m pip install -r requirements.txt && python run.py"

REM Start Frontend in a new window
echo Starting Frontend Server (Next.js)...
start "Shatranj Frontend" cmd /k "cd frontend && npm install && npm run dev"

echo Servers are launching in new windows!
pause
