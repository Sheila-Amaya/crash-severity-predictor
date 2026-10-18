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

La base es PostgreSQL 17 + PostGIS 3.5 en Docker, en el servidor y en
desarrollo. Ya no se usa Supabase.

- **Resuelto:** la base corre en un contenedor PostGIS con volumen persistente
  y se inicializa desde la semilla (`db/seed/semilla.dump`, verificada con
  SHA-256 y con los conteos).
- **Resuelto:** usuario de solo lectura. La API se conecta con el rol
  `app_lectura`, que solo tiene `CONNECT` y `SELECT` y transacciones de solo
  lectura. Probado: `INSERT`, `UPDATE` y `CREATE` se rechazan.
- **Resuelto:** las credenciales van en `.env` (ignorado por git), Compose y
  `dev.ps1` fallan si faltan y no aparecen en los logs (verificado).
- **Resuelto:** respaldo, restauración y regeneración de la semilla desde la
  base de Docker (`scripts/docker/respaldar.*`, `restaurar.*` y
  `generar_semilla.*`), probados de punta a punta.
- **Resuelto:** en desarrollo, la base se publica solo en `127.0.0.1`
  (`docker-compose.dev.yml`, puerto 5433); no es accesible desde la red local
  (probado).
- **Pendiente:**
  - Programar los respaldos (cron o tarea programada) y copiarlos fuera del
    servidor.
  - Copiar la semilla al servidor con `scp` (contiene los límites de IDEG: no
    va en una Release pública) y verificarla con su SHA-256.
  - Al eliminar el proyecto de Supabase, cambiar en el `.env` la `DB_URL` de
    desarrollo por la local (ver `.env.example`).

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
