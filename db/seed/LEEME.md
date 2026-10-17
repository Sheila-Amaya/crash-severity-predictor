# Semilla de la base de datos

`semilla.dump` (formato personalizado de `pg_dump`) con el esquema `public` de
la base PostgreSQL/PostGIS del proyecto. La restaura el contenedor `db` en su
primer arranque, con el volumen vacío (`db/docker/20_semilla.sh`), y verifica su
SHA-256 si está `semilla.dump.sha256`.

**No está en git** (microdatos del INE y tamaño). Se obtiene de una de dos formas:

- Descargándola del GitHub Release del proyecto y verificando su SHA-256
  (ver "La semilla de la base" en el README de la raíz).
- Generándola desde la base de Docker en marcha con
  `scripts/docker/generar_semilla.sh` (o `.ps1`). Un respaldo de
  `scripts/docker/respaldar.*` tiene el mismo formato y también sirve.

Para cargar una semilla o un respaldo en una base que ya tiene datos, use
`scripts/docker/restaurar.*`.
