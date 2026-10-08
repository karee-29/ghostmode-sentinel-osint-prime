@echo off
setlocal
cd /d "%~dp0.."
if not exist ".venv\Scripts\python.exe" (
  py -3.14 -m venv .venv
)
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r backend\requirements.txt
start "GhostMode Backend" cmd /k "call .venv\Scripts\activate.bat && python -m uvicorn backend.app.main:app --reload --port 8000"
cd frontend
call npm install
start "GhostMode Frontend" cmd /k "npm run dev"
