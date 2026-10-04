@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Instalar.ps1"
if errorlevel 1 (
  echo La instalacion no pudo completarse. Revisa el error anterior.
) else (
  echo Listo. Abre Iniciar DeluxXx Sound.cmd para escuchar musica.
)
pause
