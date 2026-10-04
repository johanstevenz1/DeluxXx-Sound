$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw 'Necesitas Python 3.10 o superior.' }
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'Necesitas Node.js 22.12 o superior y npm.' }
if (-not (Test-Path -LiteralPath 'backend\.venv\Scripts\python.exe')) {
    python -m venv backend\.venv
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el entorno Python.' }
}
$pythonPath = Join-Path $PSScriptRoot 'backend\.venv\Scripts\python.exe'
& $pythonPath -m pip install -r backend\requirements-lock.txt
if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar dependencias Python.' }
Push-Location -LiteralPath 'frontend'
try {
    npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar dependencias del frontend.' }
    npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar el frontend.' }
} finally { Pop-Location }
