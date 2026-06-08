@echo off
title NgopiCode Dev Server
echo ========================================
echo   NgopiCode Digital Store - Dev Mode
echo ========================================
echo.

REM Detect LAN IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  for /f "tokens=1" %%b in ("%%a") do set LAN_IP=%%b
)

echo [1/3] Starting Backend (Vendure)...
start "NgopiCode Backend" cmd /k "cd backend && npm run dev"

echo [2/3] Starting Admin Dashboard (React/Vite)...
timeout /t 5 /nobreak >nul
start "NgopiCode Dashboard" cmd /k "cd backend && npm run dev:dashboard"

echo [3/3] Starting Frontend (Nuxt)...
timeout /t 2 /nobreak >nul
start "NgopiCode Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo   All services are starting!
echo.
echo   Local:
echo     Backend:    http://localhost:3000
echo     Shop API:   http://localhost:3000/shop-api
echo     Admin API:  http://localhost:3000/admin-api
echo     Dashboard:  http://localhost:3000/dashboard
echo     Frontend:   http://localhost:3001
echo.
echo   Network (LAN):
echo     Backend:    http://%LAN_IP%:3000
echo     Frontend:   http://%LAN_IP%:3001
echo ========================================
echo.
echo Press any key to close this window...
pause >nul
