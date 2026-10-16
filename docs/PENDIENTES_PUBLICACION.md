# Pendientes antes de publicar

Lista de lo que falta para poner la aplicación en línea. Nada de esto está
implementado todavía; el estado actual es el de desarrollo local.

## 1. CORS de producción

- La configuración documentada (`CORS_ORIGINS=http://localhost:5173`) es la de
  desarrollo.
- En producción debe contener **solo** el origen exacto del frontend publicado
  (esquema, dominio y puerto, sin barra final), p. ej.
  `CORS_ORIGINS=https://severidad-vial.ejemplo.org`.
- Ya está bien configurado: `*` se ignora, sin credenciales y solo `GET` y `POST`.
- Alternativa sin CORS: servir la API bajo el mismo dominio (p. ej. `/api`
  detrás de un proxy inverso) y compilar el frontend con `VITE_API_URL` vacía.

## 2. Base de datos (Supabase)

- **RLS:** activar Row Level Security en las tablas del esquema `public`. Sin
  RLS, cualquiera con la clave `anon` del proyecto puede leerlas (o escribirlas)
  por la API REST de Supabase, sin pasar por FastAPI. Queda a cargo de la
  autora, junto con:
  - borrar `fallecido_lesionado_old`;
  - corregir `vehiculo_involucrado`.
- **Usuario de solo lectura para la API:** la API solo hace `SELECT`. Conviene
  conectarla con un rol que solo tenga `SELECT` sobre las tablas necesarias, en
  lugar del usuario `postgres`.
- **`DB_URL` como secreto del servidor** donde corra la API: nunca en el
  repositorio, en el frontend ni en los logs.
- **Pausa del plan gratuito:** Supabase pausa los proyectos inactivos. Hay que
  decidir entre un plan sin pausa y un aviso de mantenimiento.
- **Conexiones:** revisar `pool_size` / `max_overflow` del engine frente al
  límite del *pooler* de Supabase cuando haya varios workers.

## 3. Modelo (`random_forest.pkl`)

- No está en git (`data/models/*.pkl`) y pesa unos **44 MB**. Sin él,
  `/api/predecir` responde 503.
- Hace falta decidir cómo llega al servidor:
  - un *asset* de un GitHub Release;
  - o almacenamiento de objetos con URL privada.
- Al desplegar, la descarga debe verificarse con su **SHA-256** publicado.
- **Versiones fijas:** el `.pkl` debe cargarse con la misma versión de
  scikit-learn con que se entrenó (1.8.0, fijada en `requirements.txt`). Un
  cambio de versión exige volver a entrenarlo o validarlo.
- `data/clean/train.parquet` (códigos válidos del simulador) sí está en git y
  debe desplegarse junto con la API.
- Cargar un `.pkl` ejecuta código: solo deben cargarse archivos de origen
  confiable y verificados.

## 4. Límites de peticiones y recursos

- `/api/predecir` (Random Forest + SHAP) y `/api/mapa/coropletico` (GeoJSON)
  son las rutas más costosas.
- Hace falta limitar peticiones por IP, en el proxy inverso o CDN o con un
  middleware (p. ej. `slowapi`). Por ejemplo:
  - unas 30 predicciones por minuto;
  - un límite más amplio para las estadísticas.
- Hay que definir timeouts de consulta (`statement_timeout`) y tamaño máximo
  del cuerpo.
- **Caché:** las estadísticas cambian solo al cargar datos nuevos, así que
  `Cache-Control` en la API o una caché en el CDN reducirían la carga.
- Los *assets* con hash de `dist/` admiten caché larga (`immutable`), pero
  `index.html` no.

## 5. Headers de seguridad

En el servidor del frontend (y los aplicables en la API):

- `Strict-Transport-Security` (solo HTTPS).
- `Content-Security-Policy`, como punto de partida:
  - `default-src 'self'`
  - `script-src 'self'`, más el hash del script inline de `index.html` que
    fija el tema
  - `style-src 'self' 'unsafe-inline'`: hay estilos inline de React y de
    MapLibre
  - `img-src 'self' data: blob:`
  - `worker-src 'self' blob:`
  - `connect-src 'self'` y el origen de la API
  - `font-src 'self'`
  - `frame-ancestors 'none'`
- `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`, `Permissions-Policy` restrictiva.
- Decidir si `/docs` y `/openapi.json` de la API quedan públicos.

## 6. Logs y monitoreo

- Hoy los logs van a stdout en nivel INFO; los errores 500 registran el
  *traceback* completo y responden un mensaje genérico.
- Antes de publicar:
  - Comprobar que ningún *traceback* de conexión incluya la cadena de conexión
    ni la contraseña.
  - Definir retención y destino de los logs (los del proveedor de hosting o un
    servicio externo).
  - Valorar el formato JSON.
  - Revisar qué registran los *access logs* de uvicorn: las query strings solo
    llevan filtros, sin datos personales.
- Añadir un *health check* que verifique la base (hoy `GET /` no la consulta) y
  alertas de errores 5xx.

## 7. Otros

- **Licencia de IDEG:** los GeoJSON no traen términos de uso. Hay que
  confirmarlos con IDEG antes de publicar (ver `frontend/README.md`).
- **HTTPS** en frontend y API.
- **Rutas del frontend:** el hosting estático debe devolver `index.html` para
  `/simulador` y `/acerca`.
- **Variables del build:** compilar con `VITE_API_URL` de producción (el `.env`
  local apunta a `localhost:8000`).
- **Auditorías de dependencias:** `npm audit` (hoy sin vulnerabilidades) y
  `pip-audit` para la API, que no se ha ejecutado.
- **Repositorio:** si se publica la URL en el README, agregarla en
  `frontend/src/proyecto.ts` (`REPOSITORIO`) para que aparezca en "Acerca de".
