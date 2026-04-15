@echo off
echo ♟️ Starting Shatranj...

REM Start Backend in a new window
echo Starting Backend Server (FastAPI)...
start "Shatranj Backend" cmd /k "cd backend && (if exist venv\Scripts\activate.bat call venv\Scripts\activate.bat) && uvicorn app.main:app --reload --port 8000"

REM Start Frontend in a new window
echo Starting Frontend Server (Next.js)...
start "Shatranj Frontend" cmd /k "cd frontend && npm run dev"

echo Servers are launching in new windows!
pause
