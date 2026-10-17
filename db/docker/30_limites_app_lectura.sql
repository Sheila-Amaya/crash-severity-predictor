-- Límites del rol de la API (app_lectura). Idempotente.
--
-- Volumen nuevo: lo ejecuta el entrypoint de PostgreSQL después de
-- 20_semilla.sh (que crea el rol). Volumen existente: aplicarlo a mano y
-- reiniciar la API para que sus conexiones tomen los valores nuevos:
--
--   docker compose exec -T db psql -U postgres -d severidad_vial \
--     -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/30_limites_app_lectura.sql
--   docker compose restart api
--
-- Valores: las consultas de la API tardan menos de 1 s; 10 s corta cualquier
-- consulta descontrolada sin afectar el uso normal. El pool de SQLAlchemy usa
-- hasta 15 conexiones (5 + 10 de desborde); 20 deja margen sin permitir que la
-- API agote las conexiones de la base (max_connections = 100).

ALTER ROLE app_lectura CONNECTION LIMIT 20;
ALTER ROLE app_lectura SET statement_timeout = '10s';
ALTER ROLE app_lectura SET lock_timeout = '5s';
ALTER ROLE app_lectura SET idle_in_transaction_session_timeout = '30s';
