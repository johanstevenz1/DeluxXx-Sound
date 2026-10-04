@echo off
cd /d "%~dp0"
if not exist "backend\.venv\Scripts\python.exe" (
  echo Ejecuta Instalar.cmd primero para preparar la aplicacion.
  pause
  exit /b 1
)
"backend\.venv\Scripts\python.exe" launcher.py
if errorlevel 1 pause
