@echo off
cd /d %~dp0

:: --- ShoppingAI ---
echo Installing main ShoppingAI dependencies...

echo Starting ShoppingAI...
start "ShoppingAI" cmd /k "npm start"

:: --- Mistral ---
echo Installing Mistral server dependencies...
cd mistral

echo Starting Mistral server...
start "Mistral Server" cmd /k "node server.js"

:: --- Scrapper ---
echo Installing Scrapper server dependencies...
cd ..\scrapper

echo Starting Scrapper server...
start "Scrapper Server" cmd /k "node server.js"

echo All servers started!
pause
