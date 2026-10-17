# Semilla de la base de datos

`semilla.dump` (formato personalizado de `pg_dump`) con el esquema `public` de
la base PostgreSQL/PostGIS del proyecto. La restaura el contenedor `db` en su
primer arranque, con el volumen vacío (`db/docker/20_semilla.sh`), y verifica su
SHA-256 si está `semilla.dump.sha256`.

**No está en git** (microdatos del INE y tamaño), igual que el modelo
`data/models/random_forest.pkl`. Sus huellas sí están en git, en
[`SHA256SUMS`](../../SHA256SUMS) (raíz del repo).

## Flujo completo (servidor o equipo nuevo)

```bash
git clone https://github.com/Sheila-Amaya/crash-severity-predictor.git
cd crash-severity-predictor
bash scripts/descargar-artefactos.sh      # PowerShell: .\scripts\descargar-artefactos.ps1
cp .env.example .env                       # y complete las contraseñas (y DOMINIO en un servidor)
docker compose up -d --build               # servidor con HTTPS: añada -f docker-compose.yml -f docker-compose.prod.yml
```

`descargar-artefactos` baja `semilla.dump` y `random_forest.pkl` del GitHub
Release (`artefactos-v1` por defecto; otra URL con `--url` / `-Url` o la
variable `ARTEFACTOS_URL`), compara cada uno con `SHA256SUMS` y:

- si la huella coincide, lo deja en `db/seed/` o `data/models/` y escribe
  `db/seed/semilla.dump.sha256` (el contenedor la vuelve a verificar);
- si no coincide, descarta el archivo y termina con código 1;
- si el archivo ya está y es correcto, no lo descarga de nuevo; si está pero es
  distinto, no lo toca salvo con `--forzar` / `-Forzar`.

## Publicar una versión nueva de los artefactos

1. Genere la semilla desde la base de Docker en marcha con
   `scripts/docker/generar_semilla.sh` (o `.ps1`). Un respaldo de
   `scripts/docker/respaldar.*` tiene el mismo formato y también sirve.
2. Actualice las huellas y haga commit de `SHA256SUMS`:

   ```bash
   sha256sum db/seed/semilla.dump data/models/random_forest.pkl > SHA256SUMS
   git add SHA256SUMS && git commit -m "chore: huellas de los artefactos"
   ```

3. Suba los dos archivos a un Release con esos mismos nombres (con la
   [CLI de GitHub](https://cli.github.com/), o desde la página *Releases* del
   repositorio arrastrando los archivos):

   ```bash
   gh release create artefactos-v2 db/seed/semilla.dump data/models/random_forest.pkl SHA256SUMS \
     --title "Artefactos v2" --notes "Semilla de la base (INE 2018-2024) y modelo Random Forest v1."
   ```

4. Si usa una etiqueta nueva, cambie `URL_POR_DEFECTO` en los dos scripts de
   descarga (o use `ARTEFACTOS_URL`).

El Release debe ser público para descargar sin credenciales. En un repositorio
privado, use `gh release download <etiqueta> --pattern semilla.dump --dir db/seed`
(y lo mismo para el modelo en `data/models`) y luego el script, que verá los
archivos presentes y solo los verificará.

Para cargar una semilla o un respaldo en una base que ya tiene datos, use
`scripts/docker/restaurar.*`.
