# Genera db/seed/semilla.dump con un pg_dump de SOLO LECTURA de la base
# configurada en DB_URL (.env de la raíz), p. ej. Supabase.
# Equivalente a generar_semilla.sh (ver los detalles allí).
#
# Uso (desde la raíz del repo):  .\scripts\docker\generar_semilla.ps1

$ErrorActionPreference = 'Stop'
$raiz = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$imagen = 'postgis/postgis:17-3.5'
$semillas = Join-Path $raiz 'db\seed'
$salida = Join-Path $semillas 'semilla.dump'
$archivoEnv = Join-Path $raiz '.env'

if (-not (Test-Path $archivoEnv)) { throw 'No existe .env en la raíz (se necesita DB_URL).' }

# Lee DB_URL sin mostrarla; quita comillas y el driver de SQLAlchemy
$linea = Get-Content $archivoEnv | Where-Object { $_ -match '^\s*DB_URL=' } | Select-Object -Last 1
if (-not $linea) { throw 'DB_URL no está definida en .env.' }
$url = ($linea -replace '^\s*DB_URL=', '').Trim().Trim('"').Trim("'")
$url = $url -replace '^postgresql\+[a-z0-9]+://', 'postgresql://'

# Se pasa al contenedor como variable heredada (-e DB_URL, sin valor visible)
$env:DB_URL = $url
# docker escribe avisos en stderr: en PowerShell 5.1 no deben cortar el script
# (el resultado se valida con $LASTEXITCODE)
$ErrorActionPreference = 'Continue'
try {
    docker image inspect $imagen *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Descargando $imagen..."
        docker pull -q $imagen | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "No se pudo descargar $imagen." }
    }
    Write-Host 'Generando semilla (pg_dump de solo lectura)...'
    $comando = 'pg_dump "$DB_URL" --format=custom --compress=9 --no-owner --no-privileges --schema=public --exclude-table=public.fallecido_lesionado_old --file=/out/semilla.dump'
    docker run --rm -e DB_URL -e 'PGOPTIONS=-c default_transaction_read_only=on' -v "${semillas}:/out" $imagen sh -c $comando 2>&1 |
        ForEach-Object { "$_" -replace '(postgres(ql)?://)\S+', '$1***' }
    if ($LASTEXITCODE -ne 0) { throw "pg_dump terminó con código $LASTEXITCODE." }
} finally {
    Remove-Item Env:\DB_URL -ErrorAction SilentlyContinue
}

if (-not (Test-Path $salida) -or (Get-Item $salida).Length -eq 0) { throw "No se generó $salida." }

# Huella en el formato de sha256sum, para publicar junto al asset del Release
$hash = (Get-FileHash $salida -Algorithm SHA256).Hash.ToLower()
"$hash  semilla.dump" | Set-Content -Encoding ascii -NoNewline (Join-Path $semillas 'semilla.dump.sha256')
Write-Host ("Listo: db\seed\semilla.dump ({0:N1} MB)" -f ((Get-Item $salida).Length / 1MB))
Write-Host "SHA-256: $hash"
