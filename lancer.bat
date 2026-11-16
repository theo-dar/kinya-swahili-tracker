@echo off
REM lancer.bat - Double-clique pour generer l'audio de toutes les phrases.
REM Le pipeline roule dans un conteneur Docker (Linux), que la protection de Windows ne bloque pas.
cd /d "%~dp0"

docker info >nul 2>&1 && goto docker_pret
echo [1/2] Demarrage de Docker Desktop (30-90 secondes)...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
set /a essais=0
:attente
timeout /t 5 /nobreak >nul
set /a essais+=1
docker info >nul 2>&1 && goto docker_pret
if %essais% geq 40 goto erreur
goto attente

:docker_pret
echo [2/2] Generation de l'audio dans un conteneur Linux...
docker run --rm -v "%cd%":/work -v kinya-venv:/venv -v kinya-hf:/root/.cache/huggingface python:3.12-slim sh /work/pipeline/conteneur.sh || goto erreur

echo.
echo Tout est fait! Les fichiers audio sont dans le dossier audio\
pause
exit /b 0

:erreur
echo.
echo Une erreur est survenue. Prends une capture de cette fenetre et envoie-la a Claude.
pause
exit /b 1
