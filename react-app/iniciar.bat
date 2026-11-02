@echo off
title VVInmo - iniciando...
cd /d "%~dp0"

if not exist "node_modules" (
  echo Instalando dependencias del sitio...
  call npm install
)
if not exist "server\node_modules" (
  echo Instalando dependencias del servidor...
  pushd server
  call npm install
  popd
)

echo.
echo  Levantando la API (http://localhost:4000) y el sitio (http://localhost:5173)...
echo.

start "VVInmo - API" cmd /k "cd /d %~dp0server && node src/index.js"
start "VVInmo - Sitio" cmd /k "cd /d %~dp0 && npm run dev"

ping -n 7 127.0.0.1 >nul
start "" http://localhost:5173

echo  Listo. Se abrieron dos ventanas: no las cierres mientras uses el sitio.
echo  Para apagar todo, ejecuta "detener.bat".
echo.
pause
