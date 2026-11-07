@echo off
title TCP/UDP Analyzer Backend Server
echo ======================================================================
echo   TCP/UDP Client-Server Communication and Performance Analyzer
echo   Starting local server at http://127.0.0.1:8080 ...
echo ======================================================================
cd /d "%~dp0"

echo Opening dashboard in your browser...
start http://127.0.0.1:8080

echo Starting Python server...
python server.py

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start server. Please make sure Python is installed and on PATH.
    pause
)
