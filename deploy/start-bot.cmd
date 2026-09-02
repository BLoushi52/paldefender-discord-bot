@echo off
setlocal
for %%I in ("%~dp0..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"
if not exist "%PROJECT_ROOT%\logs" mkdir "%PROJECT_ROOT%\logs"
if exist "%PROJECT_ROOT%\logs\bot.log" for %%A in ("%PROJECT_ROOT%\logs\bot.log") do if %%~zA GTR 10485760 move /Y "%PROJECT_ROOT%\logs\bot.log" "%PROJECT_ROOT%\logs\bot.previous.log" >nul
set "NODE_EXE=C:\Program Files\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node.exe"
"%NODE_EXE%" "%PROJECT_ROOT%\src\index.js" >> "%PROJECT_ROOT%\logs\bot.log" 2>&1
