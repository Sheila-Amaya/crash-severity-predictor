# Levanta el entorno de desarrollo en dos ventanas de PowerShell:
#   1) API FastAPI (uvicorn --reload) con el .venv activado
#   2) Frontend Vite (npm run dev)
# Uso (desde la raíz del repo):  .\dev.ps1

$raiz = $PSScriptRoot
$activar = Join-Path $raiz '.venv\Scripts\Activate.ps1'
$frontend = Join-Path $raiz 'frontend'

if (-not (Test-Path $activar)) {
    Write-Error "No se encontró el entorno virtual en .venv. Créalo con: python -m venv .venv"
    exit 1
}

if (-not (Test-Path (Join-Path $frontend 'node_modules'))) {
    Write-Warning "frontend/node_modules no existe: ejecuta 'npm install' dentro de frontend/ antes de usar el frontend."
}

Start-Process powershell -WorkingDirectory $raiz -ArgumentList @(
    '-NoExit', '-Command',
    "& '$activar'; uvicorn core.app:app --reload"
)

Start-Process powershell -WorkingDirectory $frontend -ArgumentList @(
    '-NoExit', '-Command',
    'npm run dev'
)

Write-Host "API:      http://localhost:8000/docs"
Write-Host "Frontend: http://localhost:5173"
