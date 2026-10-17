# Descarga los artefactos que no van en git (semilla de la base y modelo) desde
# un GitHub Release y verifica cada uno contra SHA256SUMS (que sí está en git).
# Equivalente a descargar-artefactos.sh.
#
#   .\scripts\descargar-artefactos.ps1
#   .\scripts\descargar-artefactos.ps1 -Url https://.../releases/download/<etiqueta>
#   .\scripts\descargar-artefactos.ps1 -Forzar   # reemplaza archivos locales distintos
#
# URL base: -Url, variable ARTEFACTOS_URL o la de abajo. Si una huella no
# coincide, el archivo se descarta y el script sale con 1.
param(
    [string]$Url = $(if ($env:ARTEFACTOS_URL) { $env:ARTEFACTOS_URL } else { 'https://github.com/Sheila-Amaya/crash-severity-predictor/releases/download/artefactos-v1' }),
    [switch]$Forzar
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # Invoke-WebRequest es mucho más lento con la barra
# PowerShell 5.1 no usa TLS 1.2 por defecto
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz
$Url = $Url.TrimEnd('/')
$sumas = Join-Path $raiz 'SHA256SUMS'
if (-not (Test-Path $sumas)) { Write-Host 'ERROR: no está SHA256SUMS en la raíz del repo' -ForegroundColor Red; exit 1 }

function Huella([string]$archivo) { (Get-FileHash -LiteralPath $archivo -Algorithm SHA256).Hash.ToLower() }

Write-Host "Origen: $Url"
$errores = 0
foreach ($linea in Get-Content $sumas) {
    $linea = $linea.Trim()
    if (-not $linea -or $linea.StartsWith('#')) { continue }
    if ($linea -notmatch '^([0-9a-f]{64})\s+\*?(.+)$') { Write-Host "ERROR: línea inválida en SHA256SUMS: $linea" -ForegroundColor Red; exit 1 }
    $esperado = $Matches[1]
    $relativa = $Matches[2]
    $ruta = Join-Path $raiz $relativa
    $nombre = Split-Path -Leaf $relativa

    if (Test-Path -LiteralPath $ruta) {
        if ((Huella $ruta) -eq $esperado) { Write-Host "[ya presente] $relativa (SHA-256 correcto)"; continue }
        if (-not $Forzar) {
            Write-Host "ERROR: $relativa existe pero su SHA-256 no es el de SHA256SUMS. Muévalo o use -Forzar." -ForegroundColor Red
            $errores++; continue
        }
    }

    New-Item -ItemType Directory -Force (Split-Path -Parent $ruta) | Out-Null
    $parcial = "$ruta.parcial"
    Write-Host "[descargando] $nombre -> $relativa"
    try {
        Invoke-WebRequest -Uri "$Url/$nombre" -OutFile $parcial -UseBasicParsing
    } catch {
        Remove-Item -LiteralPath $parcial -Force -ErrorAction SilentlyContinue
        Write-Host "ERROR: no se pudo descargar $Url/$nombre ($($_.Exception.Message))" -ForegroundColor Red
        $errores++; continue
    }
    $real = Huella $parcial
    if ($real -ne $esperado) {
        Remove-Item -LiteralPath $parcial -Force
        Write-Host "ERROR: SHA-256 de $nombre no coincide; se descarta." -ForegroundColor Red
        Write-Host "       esperado $esperado"
        Write-Host "       obtenido $real"
        $errores++; continue
    }
    Move-Item -LiteralPath $parcial -Destination $ruta -Force
    Write-Host "[verificado]  $relativa"
}

if ($errores -gt 0) { Write-Host 'ERROR: algún artefacto falta o no es válido (ver arriba)' -ForegroundColor Red; exit 1 }

# Huella junto a la semilla: el contenedor db la verifica antes de restaurar
$semilla = Get-Content $sumas | Where-Object { $_ -match '^([0-9a-f]{64})\s+\*?db/seed/semilla\.dump$' } | Select-Object -First 1
if ($semilla) {
    $hash = ($semilla -split '\s+')[0]
    [IO.File]::WriteAllText((Join-Path $raiz 'db/seed/semilla.dump.sha256'), "$hash  semilla.dump`n")
}
Write-Host 'Listo: artefactos verificados contra SHA256SUMS.' -ForegroundColor Green
exit 0
