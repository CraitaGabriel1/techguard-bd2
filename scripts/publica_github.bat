@echo off
chcp 65001 >nul
cd /d "%~dp0.."
set MSG=
set /p MSG=Ce ai modificat? (Enter = "Actualizare proiect TECHGUARD"): 
if "%MSG%"=="" set MSG=Actualizare proiect TECHGUARD
echo.
echo Urc modificarile pe GitHub...
git add .
git commit -m "%MSG%"
REM aduce mai intai eventualele modificari de pe GitHub, apoi urca
git pull --rebase
git push
echo.
echo ===== GATA =====
pause
