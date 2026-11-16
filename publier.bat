@echo off
REM publier.bat - Envoie l'app sur GitHub Pages. Double-clique apres chaque changement.
cd /d "%~dp0"

if exist .git goto depot_pret
echo Premiere fois : creation du depot Git local...
git init -b main || goto erreur
git remote add origin https://github.com/theo-dar/kinya-swahili-tracker.git || goto erreur

:depot_pret
REM Identite Git (adresse "noreply" de GitHub pour ne pas publier ton courriel)
git config user.name >nul 2>&1 || git config user.name "theo-dar"
git config user.email >nul 2>&1 || git config user.email "theo-dar@users.noreply.github.com"

git add -A || goto erreur
git commit -m "Mise a jour de l'app" >nul 2>&1
git pull origin main --no-rebase --no-edit --allow-unrelated-histories >nul 2>&1
echo Envoi vers GitHub (une fenetre de connexion peut s'ouvrir la premiere fois)...
git push -u origin main || goto erreur

echo.
echo Publie! Ton app sera en ligne dans 1-2 minutes :
echo https://theo-dar.github.io/kinya-swahili-tracker/
pause
exit /b 0

:erreur
echo.
echo Une erreur est survenue. Prends une capture de cette fenetre et envoie-la a Claude.
pause
exit /b 1
