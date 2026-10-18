# Restaura un respaldo (o la semilla) en la base del contenedor db.
# Equivalente a restaurar.sh.
# Uso (desde la raíz del repo, con el stack levantado):
#   .\scripts\docker\restaurar.ps1 respaldos\respaldo-AAAAMMDD-HHMMSS.dump
#   (-Confirmado omite la pregunta, p. ej. en una tarea programada)

param(
    [Parameter(Mandatory = $true)][string]$Archivo,
    [switch]$Confirmado
)

$ErrorActionPreference = 'Continue'   # docker escribe avisos en stderr
if (-not (Test-Path $Archivo)) { throw "No existe $Archivo." }
$Archivo = (Resolve-Path $Archivo).Path
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..\..'))

function Exigir($paso) { if ($LASTEXITCODE -ne 0) { throw "Falló: $paso (código $LASTEXITCODE)." } }

# Si hay .sha256 junto al archivo, se verifica antes de tocar la base
if (Test-Path "$Archivo.sha256") {
    $esperado = ((Get-Content "$Archivo.sha256" -Raw).Trim() -split '\s+')[0]
    $real = (Get-FileHash $Archivo -Algorithm SHA256).Hash.ToLower()
    if ($esperado -ne $real) { throw 'El SHA-256 no coincide; no se restaura.' }
    Write-Host 'SHA-256 verificado.'
}

$base = (docker compose exec -T db printenv POSTGRES_DB).Trim(); Exigir 'leer POSTGRES_DB'
Write-Host "Se reemplazarán las tablas de la base $base con $(Split-Path $Archivo -Leaf)."
if (-not $Confirmado -and (Read-Host 'Escriba RESTAURAR para continuar') -ne 'RESTAURAR') { Write-Host 'Cancelado.'; exit 1 }

docker compose cp $Archivo db:/tmp/restaurar.dump *> $null; Exigir 'copiar el archivo'
# El esquema public ya existe: se omite de la lista de restauración
$lista = Join-Path $env:TEMP 'restaurar.lista'
docker compose exec -T db pg_restore --list /tmp/restaurar.dump |
    Where-Object { $_ -notmatch ' SCHEMA - public | COMMENT - SCHEMA public ' } |
    Set-Content -Encoding ascii $lista
docker compose cp $lista db:/tmp/restaurar.lista *> $null; Exigir 'copiar la lista'
Remove-Item $lista

Write-Host 'Restaurando (una sola transacción: si algo falla, no cambia nada)...'
docker compose exec -T db pg_restore -U postgres -d $base --clean --if-exists `
    --no-owner --no-privileges --single-transaction --exit-on-error `
    --use-list=/tmp/restaurar.lista /tmp/restaurar.dump; Exigir 'pg_restore'
docker compose exec -T db psql -U postgres -d $base -v ON_ERROR_STOP=1 -q `
    -c 'GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_lectura; ANALYZE;'; Exigir 'permisos'
docker compose exec -T db rm -f /tmp/restaurar.dump /tmp/restaurar.lista | Out-Null

Write-Host 'Conteos (víctimas, fallecidos, lesionados, hechos):'
docker compose exec -T db psql -U postgres -d $base -tA -c `
    'SELECT (SELECT count(*) FROM fallecido_lesionado), (SELECT count(*) FROM fallecido_lesionado WHERE fall_les = 1), (SELECT count(*) FROM fallecido_lesionado WHERE fall_les = 2), (SELECT count(*) FROM hecho)'
