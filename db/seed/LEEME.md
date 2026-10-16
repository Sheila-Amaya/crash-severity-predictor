# Semilla de la base de datos

`semilla.dump` (formato personalizado de `pg_dump`) con el esquema `public` de
la base del proyecto, sin `fallecido_lesionado_old`. La restaura el contenedor
`db` en su primer arranque (`db/docker/20_semilla.sh`).

**No está en git** (microdatos del INE y tamaño). Se obtiene de una de dos formas:

- Descargándola del GitHub Release del proyecto y verificando su SHA-256
  (ver "Despliegue con Docker" en el README de la raíz).
- Generándola desde Supabase con `scripts/docker/generar_semilla.sh` (o `.ps1`),
  que hace un `pg_dump` de solo lectura con el `DB_URL` del `.env`.
