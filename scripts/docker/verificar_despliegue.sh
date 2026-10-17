#!/usr/bin/env bash
# Comprobación rápida de un despliegue (después de levantarlo o actualizarlo).
# Solo hace peticiones de lectura y una predicción; no toca la base.
#
# Uso (desde cualquier carpeta del servidor, con el stack levantado):
#   bash scripts/docker/verificar_despliegue.sh https://severidad.ejemplo.org
#   bash scripts/docker/verificar_despliegue.sh http://localhost:8080      # modo local
#   bash scripts/docker/verificar_despliegue.sh https://localhost --inseguro  # CA interna de Caddy
#
# Comprueba: páginas de la SPA, /api/resumen con los conteos esperados, una
# predicción, CSP, HSTS (solo si la URL es https), que /docs, /redoc y
# /openapi.json respondan 404, la redirección de HTTP a HTTPS y que db y api
# no publiquen puertos. Sale con 1 si algo falla. No prueba los límites de
# peticiones (para no quedar bloqueado unos segundos); ver docs/DESPLIEGUE.md.
set -uo pipefail

url="${1:-}"
[[ -n "$url" ]] || { echo "Uso: bash scripts/docker/verificar_despliegue.sh <URL> [--inseguro]" >&2; exit 2; }
url="${url%/}"
opciones=(-sS --max-time 30)
[[ "${2:-}" == "--inseguro" ]] && opciones+=(-k)

raiz="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$raiz"

fallos=0
ok() { printf '  OK     %s\n' "$*"; }
mal() { printf '  FALLA  %s\n' "$*"; fallos=$((fallos + 1)); }
estado() { curl "${opciones[@]}" -o /dev/null -w '%{http_code}' "$url$1" 2>/dev/null; }

echo "Verificando $url"
for ruta in / /acerca /simulador; do
  c="$(estado "$ruta")"; [[ "$c" == 200 ]] && ok "GET $ruta -> 200" || mal "GET $ruta -> $c"
done

resumen="$(curl "${opciones[@]}" "$url/api/resumen" 2>/dev/null)"
conteos="$(printf '%s' "$resumen" | grep -oE '"(victimas|hechos|fallecidos|lesionados)":[0-9]+' | tr '\n' ' ')"
if [[ "$conteos" == *'"hechos":52488'* && "$conteos" == *'"victimas":71942'* \
   && "$conteos" == *'"fallecidos":13741'* && "$conteos" == *'"lesionados":58201'* ]]; then
  ok "GET /api/resumen -> $conteos"
else
  mal "GET /api/resumen -> ${resumen:0:120}"
fi

caso='{"tipo_eve":5,"tipo_veh":4,"g_hora_5":3,"dia_sem_ocu":6,"sexo_per":1,"edad_quinquenales":7,"mayor_menor":1,"depto_ocu":5}'
c="$(curl "${opciones[@]}" -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d "$caso" "$url/api/predecir" 2>/dev/null)"
[[ "$c" == 200 ]] && ok "POST /api/predecir -> 200" || mal "POST /api/predecir -> $c (503 = falta el modelo)"

cabeceras="$(curl "${opciones[@]}" -D - -o /dev/null "$url/" 2>/dev/null | tr -d '\r')"
grep -qi "^content-security-policy: .*script-src 'self' 'sha256-" <<<"$cabeceras" && ok "CSP con hash del script" || mal "falta la CSP"
if [[ "$url" == https://* ]]; then
  grep -qi '^strict-transport-security:' <<<"$cabeceras" && ok "HSTS presente" || mal "falta HSTS"
  sin_tls="http://${url#https://}"
  c="$(curl "${opciones[@]}" -o /dev/null -w '%{http_code}' "$sin_tls/" 2>/dev/null)"
  [[ "$c" == 308 || "$c" == 301 ]] && ok "HTTP redirige a HTTPS ($c)" || mal "HTTP no redirige a HTTPS ($c)"
else
  grep -qi '^strict-transport-security:' <<<"$cabeceras" && mal "HSTS por HTTP" || ok "sin HSTS (HTTP)"
fi

for ruta in /docs /redoc /openapi.json; do
  c="$(estado "$ruta")"; [[ "$c" == 404 ]] && ok "GET $ruta -> 404" || mal "GET $ruta -> $c (debe ser 404)"
done

# Puertos publicados de db y api en el proyecto de este directorio
if command -v docker >/dev/null 2>&1; then
  for servicio in db api; do
    id="$(docker compose ps -q "$servicio" 2>/dev/null </dev/null)"
    if [[ -z "$id" ]]; then mal "$servicio no está en ejecución"; continue; fi
    publicados="$(docker inspect -f '{{range $p, $v := .NetworkSettings.Ports}}{{if $v}}{{$p}} {{end}}{{end}}' "$id")"
    [[ -z "$publicados" ]] && ok "$servicio sin puertos publicados" || mal "$servicio publica: $publicados"
  done
fi

if [[ "$fallos" == 0 ]]; then echo "Todo correcto."; else echo "$fallos comprobaciones fallaron."; exit 1; fi
