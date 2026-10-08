python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
Write-Host "Start API: uvicorn backend.app.main:app --reload --port 8000"
Write-Host "Then: cd frontend; npm install; npm run dev"
