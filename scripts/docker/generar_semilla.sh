#!/usr/bin/env bash
# Genera la semilla (db/seed/semilla.dump + .sha256) desde la base del
# contenedor db: pg_dump del esquema public, sin dueños ni privilegios (el
# mismo formato que restaura db/docker/20_semilla.sh en un volumen vacío).
#
# Uso (desde la raíz del repo, con el contenedor db en marcha):
#   bash scripts/docker/generar_semilla.sh             # no pisa una semilla existente
#   bash scripts/docker/generar_semilla.sh --forzar    # la reemplaza (guarda .anterior)
#   bash scripts/docker/generar_semilla.sh --salida otra/ruta.dump
set -euo pipefail

raiz="$(cd "$(dirname "$0")/../.." && pwd)"
salida="$raiz/db/seed/semilla.dump"
forzar=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --forzar) forzar=1; shift ;;
    --salida) salida="$2"; shift 2 ;;
    *) echo "Opción desconocida: $1" >&2; exit 1 ;;
  esac
done

cd "$raiz"
export MSYS_NO_PATHCONV=1
# Git Bash (Windows): docker.exe necesita rutas locales en formato Windows
ruta_local() { if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi; }

if [[ -e "$salida" && $forzar -eq 0 ]]; then
  echo "ERROR: ya existe $salida. Use --forzar para reemplazarla (se guarda como .anterior)." >&2
  exit 1
fi

base="$(docker compose exec -T db printenv POSTGRES_DB </dev/null | tr -d '\r')" \
  || { echo "ERROR: el contenedor db no está en marcha (docker compose up -d db)." >&2; exit 1; }

echo "Generando la semilla desde la base $base..."
docker compose exec -T db pg_dump -U postgres -d "$base" --format=custom --compress=9 \
  --no-owner --no-privileges --schema=public --exclude-table=public.fallecido_lesionado_old \
  --file=/tmp/semilla.dump </dev/null
mkdir -p "$(dirname "$salida")"
docker compose cp db:/tmp/semilla.dump "$(ruta_local "$salida.nueva")"
docker compose exec -T db rm -f /tmp/semilla.dump </dev/null

if [[ -e "$salida" ]]; then mv -f "$salida" "$salida.anterior"; fi
mv -f "$salida.nueva" "$salida"
( cd "$(dirname "$salida")" && sha256sum "$(basename "$salida")" > "$(basename "$salida").sha256" )

echo "Listo: $salida ($(du -h "$salida" | cut -f1))"
cat "$salida.sha256"
