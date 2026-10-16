# Pendientes antes de publicar

Lista de lo que falta para poner la aplicación en línea. Con el despliegue en
Docker (ver "Despliegue con Docker" en el README) parte quedó resuelta.

**Resuelto** = implementado y probado en el stack de Docker.
**Pendiente** = falta hacerlo o decidirlo.

## 1. CORS de producción

- **Resuelto:** en Docker, nginx sirve el frontend y hace de proxy de `/api`
  en el mismo origen. La API corre con `CORS_ORIGINS` vacío: no hace falta CORS.
- Solo si la API se publicara en otro dominio: `CORS_ORIGINS` debe contener
  únicamente el origen exacto del frontend (esquema, dominio y puerto, sin
  barra final). `*` se ignora, sin credenciales y solo `GET` y `POST`.

## 2. Base de datos

- **Resuelto:** la base corre en un contenedor PostGIS con volumen
  persistente, así que la app ya no depende de que Supabase pause el proyecto.
  El modo Supabase queda como alternativa (`docker-compose.supabase.yml`).
- **Resuelto:** usuario de solo lectura. La API se conecta con el rol
  `app_lectura`, que solo tiene `CONNECT` y `SELECT` y transacciones de solo
  lectura. Probado: `INSERT`, `UPDATE` y `CREATE` se rechazan.
- **Resuelto:** las credenciales van en `.env` (ignorado por git), Compose
  falla si faltan y no aparecen en los logs (verificado).
- **Resuelto:** hay respaldo y restauración (`scripts/docker/respaldar.*` y
  `restaurar.*`), probados de punta a punta.
- **Pendiente:**
  - Programar los respaldos (cron o tarea programada) y copiarlos fuera del
    servidor.
  - Publicar la semilla `db/seed/semilla.dump` como asset de un GitHub Release,
    con su SHA-256.
- **Pendiente (si se sigue usando Supabase), a cargo de la autora:**
  - activar RLS en las tablas de `public`;
  - borrar `fallecido_lesionado_old`;
  - corregir `vehiculo_involucrado`;
  - y, en modo Supabase, conectar la API con un rol que solo tenga `SELECT`.

## 3. Modelo (`random_forest.pkl`)

- **Resuelto:** no está en la imagen ni en git. Se monta como volumen de solo
  lectura desde `./data/models`. Si falta, la API arranca, lo indica en su log
  y `/api/predecir` responde 503 (probado).
- **Resuelto:** la imagen usa Python 3.14.0 y scikit-learn 1.8.0, y el build
  verifica que el `.pkl` y SHAP cargan.
- **Pendiente:** publicar `random_forest.pkl` (unos 44 MB) como asset de un
  GitHub Release con su SHA-256, y verificarlo al descargarlo en el servidor.
  Cargar un `.pkl` ejecuta código: solo de origen confiable y verificado.

## 4. Límites de peticiones y recursos

- **Resuelto:**
  - límites de memoria por contenedor (db 512 MB, api 1 GB, web 128 MB);
  - tamaño máximo del cuerpo en nginx (16 KB);
  - timeouts del proxy (5 s para conectar y 60 s para leer).
- **Resuelto:** caché larga e inmutable para `/assets/` y `no-cache` para
  `index.html`. Gzip activado.
- **Pendiente:**
  - Limitar peticiones por IP, sobre todo `/api/predecir` (p. ej. con
    `limit_req` de nginx, unas 30 por minuto).
  - Definir `statement_timeout` en la base.
  - Valorar `Cache-Control` en las respuestas de estadísticas.

## 5. Headers de seguridad

- **Resuelto en nginx:**
  - `Content-Security-Policy`: sin `'unsafe-inline'` en scripts, con el hash
    del script del tema, que se calcula al compilar.
  - `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
    `X-Frame-Options: DENY` y `Permissions-Policy`.
  - `server_tokens off`.
  - Verificado en Chrome: sin violaciones de CSP en el mapa (incluidos el
    worker de MapLibre, el chunk diferido 1:10m y el cambio de tema), el
    simulador y "Acerca de".
- **Resuelto:** `/docs` y `/openapi.json` de la API no son públicos, porque
  nginx solo reenvía `/api/`.
- **Pendiente:** `Strict-Transport-Security`, que está comentado en
  `frontend/nginx.conf` y debe activarse cuando haya HTTPS.

## 6. Logs y monitoreo

- **Resuelto:** verificado que los logs de los tres contenedores no contienen
  cadenas de conexión ni contraseñas.
- **Resuelto:** hay health checks en los tres servicios. El de `db` comprueba
  además que los datos estén cargados, y `api` y `web` esperan a que el
  anterior esté sano.
- **Pendiente:**
  - Limitar el tamaño de los logs de Docker (`max-size` del driver
    `json-file`) o enviarlos a un servicio externo.
  - Alertas de errores 5xx y de contenedores no sanos.
  - Un health check de la API que consulte la base (hoy `GET /` no la usa).

## 7. Otros

- **Licencia de IDEG:** los GeoJSON no traen términos de uso. Hay que
  confirmarlos con IDEG antes de publicar (ver `frontend/README.md`). También
  conviene confirmar los términos de reutilización de los microdatos del INE.
- **Resuelto:** las rutas del frontend `/simulador` y `/acerca` funcionan al
  recargarlas directamente (nginx devuelve `index.html`).
- **Resuelto:** las variables del build. La imagen compila con `VITE_API_URL`
  vacía (mismo origen) y el `.env` local del frontend no entra al contexto
  de Docker.
- **Pendiente:**
  - HTTPS: un proxy con TLS delante de nginx (p. ej. Caddy o Traefik con
    Let's Encrypt) o el del proveedor.
  - El servidor de despliegue.
- **Pendiente:** auditorías de dependencias. `npm audit` no encuentra
  vulnerabilidades, pero `pip-audit` para la API no se ha ejecutado.
- **Pendiente:** reducir la imagen de la API (unos 1.2 GB, sobre todo por
  scipy, pyarrow, numba/llvmlite y pandas). No es un problema funcional.
