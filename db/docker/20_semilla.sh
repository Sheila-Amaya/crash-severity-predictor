#!/usr/bin/env bash
# Primer arranque del contenedor db (docker-entrypoint-initdb.d). Corre después
# de 10_postgis.sh de la imagen, que ya creó la extensión PostGIS.
#
#   1. Comprueba la semilla (/seed/semilla.dump) y, si existe, su SHA-256.
#   2. La restaura en $POSTGRES_DB (sin dueños ni privilegios).
#   3. Crea el rol app_lectura (solo CONNECT + SELECT) para la API.
#   4. Verifica los conteos esperados; si no coinciden, falla.
#
# Si algo falla, el volumen queda a medio inicializar: bórrelo con
#   docker compose down -v
# y vuelva a levantar el stack.
set -Eeuo pipefail

SEMILLA=/seed/semilla.dump
HUELLA=/seed/semilla.dump.sha256

falla() {
  echo "" >&2
  echo "==================================================================" >&2
  echo " ERROR al inicializar la base: $*" >&2
  echo " Luego de corregirlo: docker compose down -v && docker compose up -d" >&2
  echo "==================================================================" >&2
  exit 1
}

[[ -f "$SEMILLA" ]] || falla "falta db/seed/semilla.dump. Cópiela con scp (scp db/seed/semilla.dump TU_USUARIO@TU_SERVIDOR:crash-severity-predictor/db/seed/), verifíquela con scripts/descargar-artefactos.sh o genérela con scripts/docker/generar_semilla.sh. Ver docs/DESPLIEGUE.md, sección 5.2."
[[ -n "${APP_DB_PASSWORD:-}" ]] || falla "APP_DB_PASSWORD no está definida."

if [[ -f "$HUELLA" ]]; then
  esperado="$(cut -d' ' -f1 "$HUELLA")"
  real="$(sha256sum "$SEMILLA" | cut -d' ' -f1)"
  [[ "$esperado" == "$real" ]] || falla "el SHA-256 de semilla.dump no coincide con semilla.dump.sha256 (archivo dañado o distinto)."
  echo "Semilla: SHA-256 verificado."
else
  echo "Aviso: no hay semilla.dump.sha256; se restaura sin verificar la huella."
fi

# El esquema public ya existe (lo crea initdb): se omite de la lista
lista="$(mktemp)"
pg_restore --list "$SEMILLA" | grep -vE ' SCHEMA - public | COMMENT - SCHEMA public ' > "$lista"

echo "Restaurando la semilla en $POSTGRES_DB..."
pg_restore --exit-on-error --no-owner --no-privileges --single-transaction \
  --use-list="$lista" -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$SEMILLA" \
  || falla "pg_restore no pudo restaurar la semilla."
rm -f "$lista"

echo "Creando el rol de solo lectura app_lectura..."
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v clave="$APP_DB_PASSWORD" -v base="$POSTGRES_DB" <<'SQL'
CREATE ROLE app_lectura LOGIN PASSWORD :'clave'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
ALTER ROLE app_lectura SET default_transaction_read_only = on;
REVOKE ALL ON DATABASE :"base" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"base" TO app_lectura;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO app_lectura;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_lectura;
-- Tablas que se restauren más adelante (restaurar.sh) también quedan legibles
ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public GRANT SELECT ON TABLES TO app_lectura;
ANALYZE;
SQL

echo "Verificando conteos..."
conteos="$(psql -tA -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
  SELECT (SELECT count(*) FROM fallecido_lesionado) || ' ' ||
         (SELECT count(*) FROM fallecido_lesionado WHERE fall_les = 1) || ' ' ||
         (SELECT count(*) FROM fallecido_lesionado WHERE fall_les = 2) || ' ' ||
         (SELECT count(*) FROM hecho)")"
echo "  víctimas, fallecidos, lesionados, hechos: $conteos"
[[ "$conteos" == "71942 13741 58201 52488" ]] \
  || falla "conteos inesperados ($conteos); se esperaban 71942 13741 58201 52488."

echo "Base inicializada desde la semilla."
