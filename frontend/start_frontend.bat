@echo off
cd /d "%~dp0"
echo === Installing frontend dependencies ===
call npm install
if %errorlevel% neq 0 (
    echo npm install failed. Trying with full path...
    "C:\Program Files\nodejs\npm.cmd" install
)
echo === Starting Vite dev server ===
call npm run dev
