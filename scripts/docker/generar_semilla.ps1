# Genera la semilla (db\seed\semilla.dump + .sha256) desde la base del
# contenedor db. Equivalente a generar_semilla.sh.
#
# Uso (desde la raíz del repo, con el contenedor db en marcha):
#   .\scripts\docker\generar_semilla.ps1             # no pisa una semilla existente
#   .\scripts\docker\generar_semilla.ps1 -Forzar     # la reemplaza (guarda .anterior)
#   .\scripts\docker\generar_semilla.ps1 -Salida otra\ruta.dump

param(
    [string]$Salida,
    [switch]$Forzar
)

$ErrorActionPreference = 'Continue'   # docker escribe avisos en stderr
$raiz = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $raiz
if (-not $Salida) { $Salida = Join-Path $raiz 'db\seed\semilla.dump' }
$Salida = [IO.Path]::GetFullPath($Salida)

function Exigir($paso) { if ($LASTEXITCODE -ne 0) { throw "Falló: $paso (código $LASTEXITCODE)." } }

if ((Test-Path $Salida) -and -not $Forzar) {
    throw "Ya existe $Salida. Use -Forzar para reemplazarla (se guarda como .anterior)."
}

$base = (docker compose exec -T db printenv POSTGRES_DB)
if ($LASTEXITCODE -ne 0) { throw 'El contenedor db no está en marcha (docker compose up -d db).' }
$base = $base.Trim()

Write-Host "Generando la semilla desde la base $base..."
docker compose exec -T db pg_dump -U postgres -d $base --format=custom --compress=9 `
    --no-owner --no-privileges --schema=public --exclude-table=public.fallecido_lesionado_old `
    --file=/tmp/semilla.dump; Exigir 'pg_dump'
New-Item -ItemType Directory -Force (Split-Path $Salida) | Out-Null
docker compose cp db:/tmp/semilla.dump "$Salida.nueva" *> $null; Exigir 'copiar la semilla'
docker compose exec -T db rm -f /tmp/semilla.dump | Out-Null

if (Test-Path $Salida) { Move-Item -Force $Salida "$Salida.anterior" }
Move-Item -Force "$Salida.nueva" $Salida

# Huella en el formato de sha256sum (la verifica el contenedor al restaurar)
$hash = (Get-FileHash $Salida -Algorithm SHA256).Hash.ToLower()
"$hash  $(Split-Path $Salida -Leaf)" | Set-Content -Encoding ascii -NoNewline "$Salida.sha256"
Write-Host ("Listo: {0} ({1:N1} MB)" -f $Salida, ((Get-Item $Salida).Length / 1MB))
Write-Host "SHA-256: $hash"
