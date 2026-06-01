@echo off
title NgopiCode Dev Server
echo ========================================
echo   NgopiCode Digital Store - Dev Mode
echo ========================================
echo.

echo [1/2] Starting Backend (Vendure)...
start "NgopiCode Backend" cmd /k "cd backend && npm run dev"

echo [2/2] Starting Frontend (Nuxt)...
timeout /t 3 /nobreak >nul
start "NgopiCode Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo   Both servers are starting!
echo   Backend:  http://localhost:3000
echo   Shop API: http://localhost:3000/shop-api
echo   Admin:    http://localhost:3000/admin
echo   Frontend: http://localhost:3001
echo ========================================
echo.
echo Press any key to close this window...
pause >nul
