# Modelo y semilla de la base

La aplicación necesita dos archivos de datos que se obtienen aparte del código.
Sus huellas SHA-256 están en [`SHA256SUMS`](../../SHA256SUMS), en la raíz del
repositorio, y sirven para verificarlos.

| Archivo | Qué es | Quién lo usa |
|---|---|---|
| `db/seed/semilla.dump` | `pg_dump` (formato personalizado) del esquema `public` de la base PostgreSQL/PostGIS, unos 5 MB | El contenedor `db`, en su primer arranque con el volumen vacío (`db/docker/20_semilla.sh`) |
| `data/models/random_forest.pkl` | Modelo Random Forest entrenado (scikit-learn 1.8.0), unos 44 MB | La API, montado como volumen de solo lectura |

La semilla incluye los límites departamentales y municipales de IDEG/SEGEPLAN. Por eso se transfiere directamente al servidor con `scp` y no se distribuye como archivo de una Release.

## Obtener y verificar

1. Copia la semilla a `db/seed/` desde un equipo que la tenga. Hacia un
   servidor:

   ```bash
   scp db/seed/semilla.dump ADMIN@IP_DEL_SERVIDOR:crash-severity-predictor/db/seed/
   ```

2. Ejecuta el script de artefactos en la raíz del repositorio:

   ```bash
   bash scripts/descargar-artefactos.sh      # PowerShell: .\scripts\descargar-artefactos.ps1
   ```

El script compara cada archivo con `SHA256SUMS`:

- si un archivo ya está y su huella coincide, solo lo verifica;
- si falta el modelo, lo descarga del GitHub Release del proyecto
  (`artefactos-v1` por defecto; otra URL con `--url` / `-Url` o la variable
  `ARTEFACTOS_URL`);
- si una huella no coincide, descarta el archivo y termina con código 1;
- si un archivo local es distinto, no lo toca salvo con `--forzar` / `-Forzar`;
- al terminar, escribe `db/seed/semilla.dump.sha256`, que el contenedor `db`
  vuelve a verificar antes de restaurar.

En un repositorio privado, descarga el modelo con
`gh release download <etiqueta> --pattern random_forest.pkl --dir data/models`
y luego ejecuta el script, que solo lo verificará.

## Restaurar

- **Base nueva:** con la semilla en `db/seed/`, `docker compose up -d` la
  restaura sola al crear el volumen y comprueba los conteos.
- **Base existente:** `bash scripts/docker/restaurar.sh <archivo.dump>`
  reemplaza las tablas en una sola transacción. Sirve con la semilla o con un
  respaldo de `scripts/docker/respaldar.sh`, que tiene el mismo formato.
- **Probar sin tocar la base:** `bash scripts/docker/probar_restauracion.sh <archivo.dump>`
  restaura en una base temporal y compara los conteos.

## Actualizar los artefactos

1. Genera la semilla desde la base de Docker en marcha (sin
   `fallecido_lesionado_old`):

   ```bash
   bash scripts/docker/generar_semilla.sh            # PowerShell: .\scripts\docker\generar_semilla.ps1
   bash scripts/docker/generar_semilla.sh --forzar   # reemplaza la actual y la guarda como semilla.dump.anterior
   ```

   Crea `semilla.dump` y `semilla.dump.sha256`. Un respaldo de
   `scripts/docker/respaldar.*` también sirve, copiado como
   `db/seed/semilla.dump`.

2. Actualiza las huellas y haz commit de `SHA256SUMS`:

   ```bash
   sha256sum db/seed/semilla.dump data/models/random_forest.pkl > SHA256SUMS
   git add SHA256SUMS && git commit -m "chore: huellas de los artefactos"
   ```

3. Sube al Release solo el modelo y `SHA256SUMS`, con esos mismos nombres
   (con la [CLI de GitHub](https://cli.github.com/) o desde la página
   *Releases*). La semilla se copia a cada servidor con `scp`.

   ```bash
   gh release create artefactos-v2 data/models/random_forest.pkl SHA256SUMS \
     --title "Artefactos v2" --notes "Modelo Random Forest v1."
   ```

4. Con una etiqueta nueva, cambia `URL_POR_DEFECTO` en los dos scripts de
   artefactos o usa `ARTEFACTOS_URL`.
