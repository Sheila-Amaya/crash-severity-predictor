#!/usr/bin/env bash
# Genera db/seed/semilla.dump con un pg_dump de SOLO LECTURA de la base
# configurada en DB_URL (.env de la raíz), p. ej. Supabase.
#
#   - Esquema public, sin fallecido_lesionado_old.
#   - Sin dueños ni privilegios (se restaura en otra base con otros roles).
#   - Usa el pg_dump 17 de la imagen postgis/postgis (no hace falta instalarlo).
#   - La cadena de conexión nunca se imprime: se pasa al contenedor como
#     variable de entorno heredada (-e DB_URL, sin valor en la línea de comandos).
#
# Uso (desde la raíz del repo):  bash scripts/docker/generar_semilla.sh
set -euo pipefail

raiz="$(cd "$(dirname "$0")/../.." && pwd)"
imagen="postgis/postgis:17-3.5"
salida="$raiz/db/seed/semilla.dump"

if [[ ! -f "$raiz/.env" ]]; then
  echo "ERROR: no existe .env en la raíz (se necesita DB_URL)." >&2
  exit 1
fi

# Lee DB_URL del .env sin mostrarla; quita comillas y el driver de SQLAlchemy
DB_URL="$(grep -E '^[[:space:]]*DB_URL=' "$raiz/.env" | tail -n1 | cut -d= -f2- | tr -d '\r' | sed -E "s/^[\"']//; s/[\"']$//")"
if [[ -z "$DB_URL" ]]; then
  echo "ERROR: DB_URL no está definida en .env." >&2
  exit 1
fi
DB_URL="$(printf '%s' "$DB_URL" | sed -E 's#^postgresql\+[a-z0-9]+://#postgresql://#')"
export DB_URL

# En Git Bash (Windows) la ruta del volumen debe ir en formato Windows
montaje="$raiz/db/seed"
if pwd -W >/dev/null 2>&1; then montaje="$(cd "$raiz/db/seed" && pwd -W)"; export MSYS_NO_PATHCONV=1; fi

echo "Generando semilla (pg_dump de solo lectura)..."
docker run --rm -e DB_URL -e PGOPTIONS='-c default_transaction_read_only=on' \
  -v "$montaje:/out" "$imagen" \
  sh -c 'pg_dump "$DB_URL" --format=custom --compress=9 --no-owner --no-privileges \
           --schema=public --exclude-table=public.fallecido_lesionado_old \
           --file=/out/semilla.dump' 2>&1 \
  | sed -E 's#(postgres(ql)?://)[^ ]+#\1***#g'

if [[ ! -s "$salida" ]]; then
  echo "ERROR: no se generó $salida." >&2
  exit 1
fi

# Huella para publicar junto al asset del Release (y verificar al descargar)
( cd "$raiz/db/seed" && sha256sum semilla.dump > semilla.dump.sha256 )
echo "Listo: db/seed/semilla.dump ($(du -h "$salida" | cut -f1))"
cat "$raiz/db/seed/semilla.dump.sha256"
