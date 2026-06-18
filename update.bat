@echo off
REM ============================================================
REM  PharmaOps Portal — Push update to GitHub (auto-deploys to VPS)
REM ============================================================
cd /d "%~dp0"

git add .
git diff --cached --quiet && (echo No changes to commit. & goto end)
set /p MSG="Commit message (or press Enter for default): "
if "%MSG%"=="" set MSG=Update: %date% %time%
git commit -m "%MSG%"
git push origin main
echo.
echo Pushed! GitHub Actions will auto-deploy to pulss.co.in/operations in ~2 mins.
:end
pause
