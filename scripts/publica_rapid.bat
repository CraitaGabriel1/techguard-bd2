@echo off
REM ==================================================================
REM  TECHGUARD - urca pe GitHub toate modificarile, fara intrebari
REM  (mesajul commit-ului contine data si ora)
REM ==================================================================
chcp 65001 >nul
cd /d "%~dp0.."
echo Urc modificarile pe GitHub...
git add .
git commit -m "Etapa 2: aplicatia web TECHGUARD - actualizare %date% %time:~0,5%"
git pull --rebase
git push
echo.
echo ===== GATA ===== (fereastra se inchide singura in 15 secunde)
timeout /t 15
