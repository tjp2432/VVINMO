@echo off
title VVInmo - deteniendo...
echo Deteniendo la API y el sitio...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":4000 .*LISTENING" /c:":5173 .*LISTENING"') do (
  taskkill /f /pid %%p >nul 2>&1
)
echo Listo. Ya podes cerrar las ventanas de VVInmo.
ping -n 4 127.0.0.1 >nul
