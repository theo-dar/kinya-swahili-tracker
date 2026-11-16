@echo off
REM ouvrir.bat - Lance l app sur ton laptop (http://localhost:8000).
cd /d "%~dp0"
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8000"
py pipeline\serveur.py
