@echo off
REM ============================================================
REM  PharmaOps Portal — GitHub Push Script
REM  Run this from inside the pharma-portal folder
REM ============================================================

set REPO=pharma-portal
set USER=balaji4929

echo [1/3] Staging all files...
git add .
git commit -m "Initial commit: PharmaOps full-stack portal" 2>nul || echo (nothing new to commit)

echo.
echo [2/3] Pushing to GitHub...
git branch -M main
git push -u origin main

echo.
echo [3/3] Done! Visit: https://github.com/%USER%/%REPO%
pause
