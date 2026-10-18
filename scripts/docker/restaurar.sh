#!/usr/bin/env bash
# Restaura un respaldo (o la semilla) en la base del contenedor db, sustituyendo
# las tablas del esquema public. Luego verifica los permisos de app_lectura y
# muestra los conteos.
#
# Uso (desde la raíz del repo, con el stack levantado):
#   bash scripts/docker/restaurar.sh respaldos/diarios/respaldo-AAAAMMDD-HHMMSS.dump
set -euo pipefail

archivo="${1:-}"
if [[ -z "$archivo" || ! -f "$archivo" ]]; then
  echo "Uso: bash scripts/docker/restaurar.sh <archivo.dump>" >&2
  exit 1
fi

raiz="$(cd "$(dirname "$0")/../.." && pwd)"
archivo="$(cd "$(dirname "$archivo")" && pwd)/$(basename "$archivo")"
cd "$raiz"
export MSYS_NO_PATHCONV=1
# Git Bash (Windows): docker.exe necesita rutas locales en formato Windows
ruta_local() { if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi; }

# Nota: "docker compose exec -T" lee stdin; los exec sin entrada llevan
# </dev/null para no consumir la confirmación.

# Si hay .sha256 junto al archivo, se verifica antes de tocar la base
if [[ -f "$archivo.sha256" ]]; then
  ( cd "$(dirname "$archivo")" && sha256sum -c "$(basename "$archivo").sha256" ) \
    || { echo "ERROR: el SHA-256 no coincide; no se restaura." >&2; exit 1; }
fi

base="$(docker compose exec -T db printenv POSTGRES_DB </dev/null | tr -d '\r')"
echo "Se reemplazarán las tablas de la base $base con $(basename "$archivo")."
read -r -p "Escriba RESTAURAR para continuar: " confirmacion
[[ "$confirmacion" == "RESTAURAR" ]] || { echo "Cancelado."; exit 1; }

docker compose cp "$(ruta_local "$archivo")" db:/tmp/restaurar.dump
# El esquema public ya existe: se omite de la lista de restauración
lista="$(mktemp)"
docker compose exec -T db pg_restore --list /tmp/restaurar.dump </dev/null \
  | grep -vE ' SCHEMA - public | COMMENT - SCHEMA public ' > "$lista"
docker compose cp "$(ruta_local "$lista")" db:/tmp/restaurar.lista
rm -f "$lista"

echo "Restaurando (una sola transacción: si algo falla, no cambia nada)..."
docker compose exec -T db pg_restore -U postgres -d "$base" --clean --if-exists \
  --no-owner --no-privileges --single-transaction --exit-on-error \
  --use-list=/tmp/restaurar.lista /tmp/restaurar.dump </dev/null
docker compose exec -T db psql -U postgres -d "$base" -v ON_ERROR_STOP=1 -q \
  -c "GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_lectura; ANALYZE;"
docker compose exec -T db rm -f /tmp/restaurar.dump /tmp/restaurar.lista

echo "Conteos (víctimas, fallecidos, lesionados, hechos):"
docker compose exec -T db psql -U postgres -d "$base" -tA -c \
  "SELECT (SELECT count(*) FROM fallecido_lesionado), (SELECT count(*) FROM fallecido_lesionado WHERE fall_les = 1), (SELECT count(*) FROM fallecido_lesionado WHERE fall_les = 2), (SELECT count(*) FROM hecho)"
