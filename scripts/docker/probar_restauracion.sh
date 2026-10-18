#!/usr/bin/env bash
# Prueba un respaldo SIN tocar la base de la app: lo restaura en una base
# temporal del contenedor db, compara sus conteos con los de la base en uso y
# borra la base temporal. Sale con código distinto de 0 si algo falla o los
# conteos no coinciden. respaldar.sh lo llama después de cada respaldo.
#
# Uso (desde cualquier carpeta, con el stack levantado):
#   bash scripts/docker/probar_restauracion.sh respaldos/diarios/respaldo-AAAAMMDD-HHMMSS.dump
set -Eeuo pipefail

archivo="${1:-}"
if [[ -z "$archivo" || ! -f "$archivo" ]]; then
  echo "Uso: bash scripts/docker/probar_restauracion.sh <archivo.dump>" >&2
  exit 2
fi
archivo="$(cd "$(dirname "$archivo")" && pwd)/$(basename "$archivo")"

raiz="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$raiz"
# Git Bash (Windows): sin conversión de rutas; docker.exe recibe rutas Windows
export MSYS_NO_PATHCONV=1
ruta_local() { if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi; }

# "docker compose exec -T" lee stdin: los exec van con </dev/null
dc_exec() { docker compose exec -T db "$@" </dev/null; }

temporal="prueba_restauracion_$(date +%Y%m%d%H%M%S)_$$"
lista="$(mktemp)"
limpiar() {
  rm -f "$lista"
  dc_exec psql -U postgres -d postgres -q -c "DROP DATABASE IF EXISTS $temporal WITH (FORCE)" >/dev/null 2>&1 || true
  dc_exec rm -f "/tmp/$temporal.dump" "/tmp/$temporal.lista" >/dev/null 2>&1 || true
}
trap limpiar EXIT

CONTEOS="SELECT (SELECT count(*) FROM fallecido_lesionado), (SELECT count(*) FROM hecho), \
(SELECT count(*) FROM fallecido_lesionado WHERE fall_les = 1), \
(SELECT count(*) FROM fallecido_lesionado WHERE fall_les = 2)"

base="$(dc_exec printenv POSTGRES_DB | tr -d '\r')"

docker compose cp "$(ruta_local "$archivo")" "db:/tmp/$temporal.dump"
# template_postgis (de la imagen) ya trae PostGIS; el esquema public existe,
# así que se omite de la lista de restauración (igual que restaurar.sh)
dc_exec psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q \
  -c "CREATE DATABASE $temporal TEMPLATE template_postgis"
dc_exec pg_restore --list "/tmp/$temporal.dump" \
  | grep -vE ' SCHEMA - public | COMMENT - SCHEMA public ' > "$lista"
docker compose cp "$(ruta_local "$lista")" "db:/tmp/$temporal.lista"
dc_exec pg_restore -U postgres -d "$temporal" --no-owner --no-privileges \
  --single-transaction --exit-on-error --use-list="/tmp/$temporal.lista" "/tmp/$temporal.dump"

restaurada="$(dc_exec psql -U postgres -d "$temporal" -tA -F ' ' -c "$CONTEOS" | tr -d '\r')"
en_uso="$(dc_exec psql -U postgres -d "$base" -tA -F ' ' -c "$CONTEOS" | tr -d '\r')"

echo "Conteos (víctimas, hechos, fallecidos, lesionados)"
echo "  base en uso ($base): $en_uso"
echo "  restaurada ($temporal): $restaurada"
if [[ -z "$restaurada" || "$restaurada" != "$en_uso" ]]; then
  echo "ERROR: los conteos del respaldo restaurado no coinciden con la base en uso." >&2
  exit 1
fi
echo "Restauración de prueba correcta (la base temporal se elimina)."
