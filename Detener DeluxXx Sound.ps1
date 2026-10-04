$ErrorActionPreference = 'Stop'
$pidPath = Join-Path $PSScriptRoot '.runtime\server.pid'
if (-not (Test-Path -LiteralPath $pidPath)) { Write-Host 'No hay un servidor iniciado por el acceso directo.'; exit }
$serverProcessId = [int](Get-Content -LiteralPath $pidPath)
$serverProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $serverProcessId"
if (-not $serverProcess) { Write-Host 'El servidor ya esta detenido.'; exit }
$expectedPython = Join-Path $PSScriptRoot 'backend\.venv\Scripts\python.exe'
if ($serverProcess.ExecutablePath -ne $expectedPython -or $serverProcess.CommandLine -notlike '*uvicorn app.main:app*') {
    throw 'El proceso no coincide con el servidor de esta carpeta. No se detendra.'
}
$children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $serverProcessId"
foreach ($child in $children) {
    if ($child.CommandLine -like '*uvicorn app.main:app*') { Stop-Process -Id $child.ProcessId -ErrorAction SilentlyContinue }
}
Stop-Process -Id $serverProcessId -ErrorAction SilentlyContinue
Write-Host 'DeluxXx Sound detenido.'
