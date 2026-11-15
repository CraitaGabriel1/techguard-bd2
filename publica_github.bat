@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Urc modificarile pe GitHub...
git add .
git commit -m "Etapa 1 finalizata: relatii, ERD, normalizare, scripturi SQL, date de test, documentatie PDF"
git push
echo.
echo ===== GATA =====
pause
