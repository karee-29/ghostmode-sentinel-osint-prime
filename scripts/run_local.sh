#!/usr/bin/env bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
printf '\nStart API: uvicorn backend.app.main:app --reload --port 8000\nThen: cd frontend && npm install && npm run dev\n'
