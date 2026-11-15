@echo off
REM ==================================================================
REM  TECHGUARD - Etapa 1: creeaza baza de date "techguard",
REM  cele 13 tabele, datele de test si ruleaza verificarile.
REM  Dublu-click pe acest fisier sau ruleaza-l din PowerShell.
REM ==================================================================
chcp 65001 >nul
cd /d "%~dp0.."
set PGCLIENTENCODING=UTF8
set PSQL=A:\APLICATII\POSTGRESS\bin\psql.exe

if not exist "%PSQL%" (
    echo [EROARE] Nu gasesc psql.exe la %PSQL%
    echo Modifica linia "set PSQL=..." din acest fisier cu calea corecta.
    pause
    exit /b 1
)

set /p PGPASSWORD=Parola utilizatorului postgres: 
cls

echo.
echo [1/4] Creez baza de date techguard (daca nu exista)...
"%PSQL%" -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='techguard'" | find "1" >nul || "%PSQL%" -U postgres -c "CREATE DATABASE techguard"

echo [2/4] Creez cele 13 tabele...
"%PSQL%" -U postgres -d techguard -q -v ON_ERROR_STOP=1 -f database\01_schema.sql 2>nul
if errorlevel 1 ( echo [EROARE] la 01_schema.sql & pause & exit /b 1 )

echo [3/4] Introduc datele de test...
"%PSQL%" -U postgres -d techguard -q -v ON_ERROR_STOP=1 -f database\02_date_test.sql >nul
if errorlevel 1 ( echo [EROARE] la 02_date_test.sql & pause & exit /b 1 )

echo [4/4] Rulez verificarile (rezultatul se salveaza si in database\rezultat_verificare.txt)...
"%PSQL%" -U postgres -d techguard -f database\03_verificare.sql > database\rezultat_verificare.txt 2>&1
type database\rezultat_verificare.txt

set PGPASSWORD=
echo.
echo ===== GATA! Baza de date techguard este creata si populata. =====
pause
