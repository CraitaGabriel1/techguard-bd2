@echo off
REM ==================================================================
REM  TECHGUARD - porneste site-ul (dublu-click)
REM  Instaleaza automat pachetele lipsa (npm install).
REM  Site-ul se deschide la http://localhost:3000
REM ==================================================================
chcp 65001 >nul
cd /d "%~dp0..\app"

where node >nul 2>nul
if errorlevel 1 (
    echo [EROARE] Node.js nu este instalat. Instaleaza-l de pe https://nodejs.org (versiunea LTS^).
    pause
    exit /b 1
)

if not exist ".env" (
    echo [EROARE] Lipseste fisierul app\.env
    echo Copiaza app\.env.example cu numele .env si scrie parola ta de PostgreSQL.
    pause
    exit /b 1
)

echo Verific / instalez pachetele (npm install^)...
call npm install --no-audit --no-fund

REM Deschide browserul dupa 4 secunde (cat timp porneste serverul)
start "" cmd /c "timeout /t 4 >nul & start http://localhost:3000"
npm run dev
