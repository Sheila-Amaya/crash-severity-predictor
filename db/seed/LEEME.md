# Semilla de la base de datos

`semilla.dump` (formato personalizado de `pg_dump`) con el esquema `public` de
la base PostgreSQL/PostGIS del proyecto. La restaura el contenedor `db` en su
primer arranque, con el volumen vacío (`db/docker/20_semilla.sh`), y verifica su
SHA-256 si está `semilla.dump.sha256`.

**No está en git** (microdatos del INE y tamaño), igual que el modelo
`data/models/random_forest.pkl`. Sus huellas sí están en git, en
[`SHA256SUMS`](../../SHA256SUMS) (raíz del repo).

**El semilla.dump contiene los límites de IDEG: no lo publiques en una Release pública; copia los archivos al servidor con scp.**

## Flujo completo (servidor o equipo nuevo)

```bash
git clone https://github.com/Sheila-Amaya/crash-severity-predictor.git
cd crash-severity-predictor
# Copie db/seed/semilla.dump desde su equipo. Hacia un servidor (en su equipo):
#   scp db/seed/semilla.dump ADMIN@IP_DEL_SERVIDOR:crash-severity-predictor/db/seed/
bash scripts/descargar-artefactos.sh      # PowerShell: .\scripts\descargar-artefactos.ps1
cp .env.example .env                       # y complete las contraseñas (y DOMINIO en un servidor)
docker compose up -d --build               # servidor con HTTPS: añada -f docker-compose.yml -f docker-compose.prod.yml
```

`descargar-artefactos` compara cada archivo con `SHA256SUMS`. La semilla ya
copiada solo se verifica; el modelo se descarga del GitHub Release
(`artefactos-v1` por defecto; otra URL con `--url` / `-Url` o la variable
`ARTEFACTOS_URL`). En cada caso:

- si la huella coincide, lo deja en `db/seed/` o `data/models/` y escribe
  `db/seed/semilla.dump.sha256` (el contenedor la vuelve a verificar);
- si no coincide, descarta el archivo y termina con código 1;
- si el archivo ya está y es correcto, no lo descarga de nuevo; si está pero es
  distinto, no lo toca salvo con `--forzar` / `-Forzar`.

## Publicar una versión nueva de los artefactos

1. Genere la semilla desde la base de Docker en marcha (es un `pg_dump` del
   esquema `public`, sin `fallecido_lesionado_old`, de unos 5 MB):

   ```bash
   bash scripts/docker/generar_semilla.sh            # PowerShell: .\scripts\docker\generar_semilla.ps1
   bash scripts/docker/generar_semilla.sh --forzar   # reemplaza la actual y la guarda como semilla.dump.anterior
   ```

   Crea `semilla.dump` y `semilla.dump.sha256`. Un respaldo de
   `scripts/docker/respaldar.*` tiene el mismo formato y también sirve
   (copiado como `db/seed/semilla.dump`, con su huella).
2. Actualice las huellas y haga commit de `SHA256SUMS`:

   ```bash
   sha256sum db/seed/semilla.dump data/models/random_forest.pkl > SHA256SUMS
   git add SHA256SUMS && git commit -m "chore: huellas de los artefactos"
   ```

3. Suba al Release solo el modelo y las huellas, con esos mismos nombres (con
   la [CLI de GitHub](https://cli.github.com/), o desde la página *Releases*
   del repositorio arrastrando los archivos). La semilla no va en el Release:
   cópiela a cada servidor con `scp`.

   ```bash
   gh release create artefactos-v2 data/models/random_forest.pkl SHA256SUMS \
     --title "Artefactos v2" --notes "Modelo Random Forest v1."
   ```

4. Si usa una etiqueta nueva, cambie `URL_POR_DEFECTO` en los dos scripts de
   descarga (o use `ARTEFACTOS_URL`).

El Release debe ser público para descargar el modelo sin credenciales. En un
repositorio privado, use `gh release download <etiqueta> --pattern random_forest.pkl --dir data/models`
y luego el script, que verá los archivos presentes y solo los verificará.

Para cargar una semilla o un respaldo en una base que ya tiene datos, use
`scripts/docker/restaurar.*`.
