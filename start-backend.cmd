@echo off
setlocal
cd /d "%~dp0"

start "AI Resume AI Service" /min cmd /k "cd /d ""%~dp0backend-ai"" && venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8001"
start "AI Resume Node Backend" /min cmd /k "cd /d ""%~dp0backend-node"" && set ""AI_SERVICE_URL=http://127.0.0.1:8001"" && node server.js"

echo Backend launch commands sent.
