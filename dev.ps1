# Entorno de desarrollo con la base PostgreSQL/PostGIS de Docker:
#   1) Levanta el contenedor db publicado solo en 127.0.0.1 (docker-compose.dev.yml)
#      y espera a que esté sano (con los datos cargados).
#   2) Abre dos ventanas de PowerShell:
#      - API FastAPI (uvicorn --reload, .venv activado) conectada a esa base con
#        el rol de solo lectura app_lectura;
#      - frontend Vite (npm run dev), con el proxy de /api hacia esa API.
#
# Uso (desde la raíz del repo):
#   .\dev.ps1                  # todo
#   .\dev.ps1 -SoloBase        # solo la base (p. ej. para pytest -m integration)
#   .\dev.ps1 -PuertoApi 8001  # si el puerto 8000 está ocupado
#
# Lee POSTGRES_PASSWORD, APP_DB_PASSWORD y, opcionalmente, POSTGRES_DB y
# DB_PUERTO_LOCAL del .env de la raíz (ver .env.example). La DB_URL de la API se
# arma aquí y solo vive en las ventanas que se abren: no se imprime.

param(
    [string]$ArchivoEnv = '.env',
    [int]$PuertoApi = 8000,
    [switch]$SoloBase
)

$ErrorActionPreference = 'Stop'
$raiz = $PSScriptRoot
$activar = Join-Path $raiz '.venv\Scripts\Activate.ps1'
$frontend = Join-Path $raiz 'frontend'
$rutaEnv = if ([IO.Path]::IsPathRooted($ArchivoEnv)) { $ArchivoEnv } else { Join-Path $raiz $ArchivoEnv }

function Detener($mensaje) {
    Write-Host ''
    Write-Host "ERROR: $mensaje" -ForegroundColor Red
    exit 1
}

# -- 1. Requisitos ------------------------------------------------------------
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Detener 'No se encontró Docker. Instale Docker Desktop: https://www.docker.com/products/docker-desktop/'
}
$ErrorActionPreference = 'Continue'   # docker escribe avisos en stderr
docker info *> $null
if ($LASTEXITCODE -ne 0) { Detener 'Docker no está corriendo. Abra Docker Desktop, espere a que inicie y vuelva a ejecutar .\dev.ps1.' }
$ErrorActionPreference = 'Stop'

if (-not (Test-Path $rutaEnv)) { Detener "No existe $rutaEnv. Cópielo de .env.example y complete las contraseñas." }

function Leer-Variable($nombre, $porDefecto = '') {
    $linea = Get-Content $rutaEnv | Where-Object { $_ -match "^\s*$nombre\s*=" } | Select-Object -Last 1
    if (-not $linea) { return $porDefecto }
    $valor = ($linea -replace "^\s*$nombre\s*=", '').Trim().Trim('"').Trim("'")
    if ($valor) { return $valor } else { return $porDefecto }
}

$claveApp = Leer-Variable 'APP_DB_PASSWORD'
if (-not (Leer-Variable 'POSTGRES_PASSWORD')) { Detener "Falta POSTGRES_PASSWORD en $ArchivoEnv (ver .env.example)." }
if (-not $claveApp) { Detener "Falta APP_DB_PASSWORD en $ArchivoEnv (ver .env.example)." }
$base = Leer-Variable 'POSTGRES_DB' 'severidad_vial'
$puertoDb = Leer-Variable 'DB_PUERTO_LOCAL' '5433'

if (-not $SoloBase) {
    if (-not (Test-Path $activar)) { Detener 'No se encontró el entorno virtual en .venv. Créelo con: python -m venv .venv' }
    if (-not (Test-Path (Join-Path $frontend 'node_modules'))) {
        Write-Warning "frontend/node_modules no existe: ejecute 'npm install' dentro de frontend/."
    }
}

# -- 2. Base de datos en Docker (solo 127.0.0.1) ------------------------------
$compose = @('compose', '--env-file', $rutaEnv, '-f', (Join-Path $raiz 'docker-compose.yml'), '-f', (Join-Path $raiz 'docker-compose.dev.yml'))

Write-Host "Levantando la base de Docker en 127.0.0.1:$puertoDb..."
$ErrorActionPreference = 'Continue'
docker @compose up -d db 2>&1 | Where-Object { "$_" -match 'Error|error' } | ForEach-Object { Write-Host "  $_" }
if ($LASTEXITCODE -ne 0) { Detener "docker compose no pudo levantar la base (¿puerto $puertoDb ocupado? cambie DB_PUERTO_LOCAL en $ArchivoEnv)." }

Write-Host 'Esperando a que la base esté sana (con los datos cargados)...'
$estado = ''
for ($i = 0; $i -lt 90; $i++) {
    $estado = (docker @compose ps db --format '{{.Health}}' 2>$null | Select-Object -First 1)
    if ($estado -eq 'healthy') { break }
    Start-Sleep -Seconds 2
}
$ErrorActionPreference = 'Stop'
if ($estado -ne 'healthy') {
    Detener "La base no quedó sana (estado: '$estado'). Revise: docker compose logs db"
}
Write-Host "Base lista: postgresql://app_lectura:***@127.0.0.1:$puertoDb/$base" -ForegroundColor Green

if ($SoloBase) {
    Write-Host ''
    Write-Host 'Para la API o las pruebas de integración, use en .env:'
    Write-Host "  DB_URL=postgresql+psycopg2://app_lectura:<APP_DB_PASSWORD>@127.0.0.1:$puertoDb/$base"
    exit 0
}

# -- 3. API y frontend --------------------------------------------------------
# Las ventanas heredan estas variables (tienen prioridad sobre .env); aquí se
# restauran al terminar para no dejar la contraseña en esta sesión.
$previas = @{ DB_URL = $env:DB_URL; VITE_API_URL = $env:VITE_API_URL }
try {
    $env:DB_URL = "postgresql+psycopg2://app_lectura:$([uri]::EscapeDataString($claveApp))@127.0.0.1:$puertoDb/$base"
    $env:VITE_API_URL = "http://localhost:$PuertoApi"

    Start-Process powershell -WorkingDirectory $raiz -ArgumentList @(
        '-NoExit', '-Command',
        "& '$activar'; uvicorn core.app:app --reload --port $PuertoApi"
    )
    Start-Process powershell -WorkingDirectory $frontend -ArgumentList @(
        '-NoExit', '-Command',
        'npm run dev'
    )
} finally {
    $env:DB_URL = $previas.DB_URL
    $env:VITE_API_URL = $previas.VITE_API_URL
}

Write-Host "API:      http://localhost:$PuertoApi/docs"
Write-Host 'Frontend: http://localhost:5173 (o el siguiente puerto libre que indique Vite)'
exit 0
