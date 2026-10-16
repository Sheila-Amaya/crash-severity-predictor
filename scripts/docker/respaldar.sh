#!/usr/bin/env bash
# Respaldo de la base del contenedor db (esquema public, formato personalizado
# de pg_dump, el mismo de la semilla: un respaldo puede usarse como semilla).
#
# Uso (desde la raíz del repo, con el stack levantado):
#   bash scripts/docker/respaldar.sh
# Salida: respaldos/respaldo-AAAAMMDD-HHMMSS.dump (+ .sha256). respaldos/ está en .gitignore.
set -euo pipefail

raiz="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$raiz"
# Git Bash (Windows): que no convierta rutas como db:/tmp/...
export MSYS_NO_PATHCONV=1

base="$(docker compose exec -T db printenv POSTGRES_DB </dev/null | tr -d '\r')"
nombre="respaldo-$(date +%Y%m%d-%H%M%S).dump"
mkdir -p respaldos

echo "Respaldando la base $base..."
docker compose exec -T db pg_dump -U postgres -d "$base" --format=custom --compress=9 \
  --no-owner --no-privileges --schema=public --file="/tmp/$nombre"
docker compose cp "db:/tmp/$nombre" "respaldos/$nombre"
docker compose exec -T db rm -f "/tmp/$nombre"

( cd respaldos && sha256sum "$nombre" > "$nombre.sha256" )
echo "Listo: respaldos/$nombre ($(du -h "respaldos/$nombre" | cut -f1))"
