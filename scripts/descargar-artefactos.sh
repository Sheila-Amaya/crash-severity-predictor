#!/usr/bin/env bash
# Descarga los artefactos que no van en git (la semilla de la base y el modelo)
# desde un GitHub Release y verifica cada uno contra SHA256SUMS, que SÍ está en
# git: la huella de referencia no viene del mismo lugar que el archivo.
#
# Uso (desde cualquier carpeta):
#   bash scripts/descargar-artefactos.sh
#   bash scripts/descargar-artefactos.sh --url https://.../releases/download/<etiqueta>
#   bash scripts/descargar-artefactos.sh --forzar   # reemplaza archivos locales distintos
#
# URL base (en este orden): --url, variable ARTEFACTOS_URL o la de abajo. Cada
# archivo se pide como <URL base>/<nombre del archivo> (semilla.dump,
# random_forest.pkl). Un archivo que ya está y coincide no se descarga de nuevo.
# Si una huella no coincide, el archivo se descarta y el script sale con 1.
set -Eeuo pipefail

URL_POR_DEFECTO="https://github.com/Sheila-Amaya/crash-severity-predictor/releases/download/artefactos-v1"

raiz="$(cd "$(dirname "$0")/.." && pwd)"
cd "$raiz"

url="${ARTEFACTOS_URL:-$URL_POR_DEFECTO}"
forzar=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --url) url="${2:?falta la URL después de --url}"; shift 2 ;;
    --forzar) forzar=1; shift ;;
    -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
    *) echo "Opción desconocida: $1 (use --help)" >&2; exit 2 ;;
  esac
done
url="${url%/}"

falla() { echo "ERROR: $*" >&2; exit 1; }

if command -v sha256sum >/dev/null 2>&1; then
  huella() { sha256sum "$1" | cut -d' ' -f1; }
elif command -v shasum >/dev/null 2>&1; then
  huella() { shasum -a 256 "$1" | cut -d' ' -f1; }
else
  falla "se necesita sha256sum o shasum"
fi
if command -v curl >/dev/null 2>&1; then
  bajar() { curl -fsSL --retry 3 --connect-timeout 15 --proto '=https,http' -o "$2" "$1"; }
elif command -v wget >/dev/null 2>&1; then
  bajar() { wget -q -O "$2" "$1"; }
else
  falla "se necesita curl o wget"
fi

[[ -f SHA256SUMS ]] || falla "no está SHA256SUMS en la raíz del repo"

parcial=""
trap '[[ -n "$parcial" ]] && rm -f "$parcial"' EXIT

echo "Origen: $url"
errores=0
while read -r esperado ruta; do
  [[ -z "${esperado:-}" || "$esperado" == \#* ]] && continue
  [[ "$esperado" =~ ^[0-9a-f]{64}$ ]] || falla "línea inválida en SHA256SUMS: $esperado $ruta"
  ruta="${ruta%$'\r'}"
  nombre="$(basename "$ruta")"

  if [[ -f "$ruta" ]]; then
    if [[ "$(huella "$ruta")" == "$esperado" ]]; then
      echo "[ya presente] $ruta (SHA-256 correcto)"
      continue
    fi
    if [[ "$forzar" != 1 ]]; then
      echo "ERROR: $ruta existe pero su SHA-256 no es el de SHA256SUMS." >&2
      echo "       Muévalo o use --forzar para reemplazarlo." >&2
      errores=1
      continue
    fi
  fi

  mkdir -p "$(dirname "$ruta")"
  parcial="$ruta.parcial"
  echo "[descargando] $nombre -> $ruta"
  if ! bajar "$url/$nombre" "$parcial"; then
    rm -f "$parcial"
    echo "ERROR: no se pudo descargar $url/$nombre" >&2
    errores=1
    continue
  fi
  real="$(huella "$parcial")"
  if [[ "$real" != "$esperado" ]]; then
    rm -f "$parcial"
    echo "ERROR: SHA-256 de $nombre no coincide; se descarta." >&2
    echo "       esperado $esperado" >&2
    echo "       obtenido $real" >&2
    errores=1
    continue
  fi
  mv -f "$parcial" "$ruta"
  parcial=""
  echo "[verificado]  $ruta"
done < SHA256SUMS

[[ "$errores" == 0 ]] || falla "algún artefacto falta o no es válido (ver arriba)"

# Huella junto a la semilla: el contenedor db la verifica antes de restaurar
semilla="$(grep -E '  db/seed/semilla\.dump$' SHA256SUMS | cut -d' ' -f1)"
[[ -n "$semilla" ]] && printf '%s  semilla.dump\n' "$semilla" > db/seed/semilla.dump.sha256
echo "Listo: artefactos verificados contra SHA256SUMS."
