@echo off
setlocal
cd /d "%~dp0.."
if not exist "logs" mkdir "logs"
if exist "logs\bot.log" for %%A in ("logs\bot.log") do if %%~zA GTR 10485760 move /Y "logs\bot.log" "logs\bot.previous.log" >nul
set "NODE_EXE=C:\Program Files\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node.exe"
"%NODE_EXE%" src\index.js >> logs\bot.log 2>&1
