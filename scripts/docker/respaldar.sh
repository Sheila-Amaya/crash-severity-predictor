#!/usr/bin/env bash
# Respaldo de la base del contenedor db (esquema public, formato personalizado
# de pg_dump, el mismo de la semilla: un respaldo puede usarse como semilla).
# Preparado para cron: no pide nada, registra con fecha y sale con código
# distinto de 0 ante cualquier falla (ver deploy/cron/respaldos.crontab).
#
# Uso (desde cualquier carpeta, con el stack levantado):
#   bash scripts/docker/respaldar.sh
#
# Pasos: pg_dump en el contenedor -> pg_restore --list (archivo legible) ->
# copia al host y comparación de SHA-256 -> restauración de prueba en una base
# temporal con conteos (probar_restauracion.sh) -> archivo .sha256 -> poda.
# Un respaldo que falla en cualquier paso no se guarda ni dispara la poda.
#
# Salida (respaldos/ está en .gitignore):
#   respaldos/diarios/respaldo-AAAAMMDD-HHMMSS.dump (+ .sha256)
#   respaldos/semanales/...  copia del respaldo del día semanal
#
# Variables opcionales (valores por defecto):
#   RESPALDOS_DIR=<repo>/respaldos   carpeta de destino
#   RETENER_DIARIOS=7                respaldos diarios que se conservan
#   RETENER_SEMANALES=4              respaldos semanales que se conservan
#   DIA_SEMANAL=7                    día del semanal (1 = lunes ... 7 = domingo)
#   VERIFICAR_RESTAURACION=1         0 = omitir la restauración de prueba
set -Eeuo pipefail

raiz="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$raiz"
# Git Bash (Windows): sin conversión de rutas; docker.exe recibe rutas Windows
export MSYS_NO_PATHCONV=1
ruta_local() { if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi; }

destino="${RESPALDOS_DIR:-$raiz/respaldos}"
retener_diarios="${RETENER_DIARIOS:-7}"
retener_semanales="${RETENER_SEMANALES:-4}"
dia_semanal="${DIA_SEMANAL:-7}"
verificar="${VERIFICAR_RESTAURACION:-1}"

registro() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
falla() { registro "ERROR: $*" >&2; exit 1; }
trap 'registro "ERROR: falló el comando de la línea $LINENO (código $?); respaldo NO guardado" >&2' ERR

for n in "$retener_diarios" "$retener_semanales" "$dia_semanal"; do
  [[ "$n" =~ ^[1-9][0-9]*$ ]] || falla "RETENER_DIARIOS, RETENER_SEMANALES y DIA_SEMANAL deben ser enteros >= 1"
done

mkdir -p "$destino/diarios" "$destino/semanales"

# Un solo respaldo a la vez (flock existe en Linux; en Git Bash se omite)
if command -v flock >/dev/null 2>&1; then
  exec 9>"$destino/.respaldar.lock"
  flock -n 9 || falla "ya hay un respaldo en curso"
fi

# "docker compose exec -T" lee stdin: los exec van con </dev/null
dc_exec() { docker compose exec -T db "$@" </dev/null; }

docker compose ps --status running --services </dev/null | grep -qx db \
  || falla "el servicio db no está en ejecución (docker compose up -d)"

base="$(dc_exec printenv POSTGRES_DB | tr -d '\r')"
nombre="respaldo-$(date +%Y%m%d-%H%M%S).dump"
en_contenedor="/tmp/$nombre"
parcial="$destino/diarios/.$nombre.parcial"
limpiar() {
  rm -f "$parcial"
  dc_exec rm -f "$en_contenedor" >/dev/null 2>&1 || true
}
trap limpiar EXIT

registro "Respaldando la base $base en $nombre"
dc_exec pg_dump -U postgres -d "$base" --format=custom --compress=9 \
  --no-owner --no-privileges --schema=public --file="$en_contenedor"
# Detecta un archivo truncado o ilegible antes de copiarlo
dc_exec pg_restore --list "$en_contenedor" >/dev/null
sha_contenedor="$(dc_exec sha256sum "$en_contenedor" | tr -d '\r' | cut -d' ' -f1)"

docker compose cp "db:$en_contenedor" "$(ruta_local "$parcial")"
sha_local="$(sha256sum "$parcial" | cut -d' ' -f1)"
[[ -n "$sha_local" && "$sha_local" == "$sha_contenedor" ]] \
  || falla "el SHA-256 de la copia no coincide con el del contenedor"
registro "SHA-256 verificado: $sha_local"

if [[ "$verificar" != "0" ]]; then
  registro "Restauración de prueba en una base temporal"
  bash "$raiz/scripts/docker/probar_restauracion.sh" "$parcial"
fi

mv "$parcial" "$destino/diarios/$nombre"
( cd "$destino/diarios" && sha256sum "$nombre" > "$nombre.sha256" && sha256sum -c --quiet "$nombre.sha256" )
registro "Guardado: diarios/$nombre ($(du -h "$destino/diarios/$nombre" | cut -f1))"

if [[ "$(date +%u)" == "$dia_semanal" ]]; then
  cp "$destino/diarios/$nombre" "$destino/diarios/$nombre.sha256" "$destino/semanales/"
  ( cd "$destino/semanales" && sha256sum -c --quiet "$nombre.sha256" )
  registro "Copia semanal: semanales/$nombre"
fi

# Poda: conserva los N más recientes de cada carpeta (el nombre lleva la fecha)
podar() {
  local carpeta="$1" conservar="$2" archivo
  local -a archivos=()
  mapfile -t archivos < <(find "$carpeta" -maxdepth 1 -name 'respaldo-*.dump' -type f | sort -r)
  for archivo in "${archivos[@]:$conservar}"; do
    rm -f "$archivo" "$archivo.sha256"
    registro "Eliminado por retención: ${archivo#"$destino"/}"
  done
}
podar "$destino/diarios" "$retener_diarios"
podar "$destino/semanales" "$retener_semanales"

registro "Respaldo completo"
