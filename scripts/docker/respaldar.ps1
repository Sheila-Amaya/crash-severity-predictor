# Respaldo de la base del contenedor db. Equivalente a respaldar.sh.
# Uso (desde la raíz del repo, con el stack levantado):
#   .\scripts\docker\respaldar.ps1
# Salida: respaldos\respaldo-AAAAMMDD-HHMMSS.dump (+ .sha256).

$ErrorActionPreference = 'Continue'   # docker escribe avisos en stderr
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..\..'))

function Exigir($paso) { if ($LASTEXITCODE -ne 0) { throw "Falló: $paso (código $LASTEXITCODE)." } }

$base = (docker compose exec -T db printenv POSTGRES_DB).Trim(); Exigir 'leer POSTGRES_DB'
$nombre = 'respaldo-{0}.dump' -f (Get-Date -Format 'yyyyMMdd-HHmmss')
New-Item -ItemType Directory -Force respaldos | Out-Null

Write-Host "Respaldando la base $base..."
docker compose exec -T db pg_dump -U postgres -d $base --format=custom --compress=9 `
    --no-owner --no-privileges --schema=public --file="/tmp/$nombre"; Exigir 'pg_dump'
docker compose cp "db:/tmp/$nombre" "respaldos/$nombre" *> $null; Exigir 'copiar el respaldo'
docker compose exec -T db rm -f "/tmp/$nombre" | Out-Null

$hash = (Get-FileHash "respaldos/$nombre" -Algorithm SHA256).Hash.ToLower()
"$hash  $nombre" | Set-Content -Encoding ascii -NoNewline "respaldos/$nombre.sha256"
Write-Host ("Listo: respaldos\{0} ({1:N1} MB)" -f $nombre, ((Get-Item "respaldos/$nombre").Length / 1MB))
