# Despliegue en un servidor Ubuntu

Guía para publicar la app en un servidor propio (VPS) con **Ubuntu 22.04 o
24.04**, al menos **2 GB de RAM**, un dominio y HTTPS automático. Queda así:

```
Internet ──80/443──► caddy (TLS, HSTS) ──► web (nginx: SPA, CSP, límites) ──► api ──► db
                     único con puertos      red interna, sin puertos publicados
```

Lo que se mantiene solo: certificados (Caddy los obtiene y renueva),
parches de seguridad del sistema, reinicio de contenedores, rotación de
registros y respaldos diarios verificados. Lo manual: actualizar la app,
revisar de vez en cuando el registro de respaldos y copiarlos fuera del
servidor.

Convenciones: `ADMIN` es el usuario que creará, `IP_DEL_SERVIDOR` la IP
pública y `severidad.ejemplo.org` su dominio. Los comandos con `sudo` van en el
servidor; los marcados **(en su equipo)**, en su computadora.

Contenido:

1. [Usuario y acceso SSH](#1-usuario-y-acceso-ssh)
2. [Cortafuegos, actualizaciones y hora](#2-cortafuegos-actualizaciones-y-hora)
3. [Memoria de intercambio (swap)](#3-memoria-de-intercambio-swap)
4. [Docker](#4-docker)
5. [Código, artefactos y `.env`](#5-código-artefactos-y-env)
6. [DNS](#6-dns)
7. [Arranque y verificación de HTTPS](#7-arranque-y-verificación-de-https)
8. [Respaldos automáticos](#8-respaldos-automáticos)
9. [Actualizar y volver atrás](#9-actualizar-y-volver-atrás)
10. [Problemas frecuentes](#10-problemas-frecuentes)
11. [Referencia del stack de Docker](#11-referencia-del-stack-de-docker)

---

## 1. Usuario y acceso SSH

### 1.1 Clave SSH (en su equipo)

Si aún no tiene una clave:

```bash
ssh-keygen -t ed25519 -C "servidor severidad"
```

Acepte la ruta por defecto y ponga una frase de paso. La clave pública queda
en `~/.ssh/id_ed25519.pub` (Windows: `%USERPROFILE%\.ssh\id_ed25519.pub`).

### 1.2 Usuario sin privilegios de root

Entre como `root` (o el usuario inicial que dé el proveedor) y cree el
usuario de administración:

```bash
ssh root@IP_DEL_SERVIDOR
adduser ADMIN                 # pide una contraseña: se usará solo para sudo
usermod -aG sudo ADMIN
```

### 1.3 Copiar la clave pública al usuario nuevo (en su equipo)

Linux o macOS:

```bash
ssh-copy-id ADMIN@IP_DEL_SERVIDOR
```

Windows (PowerShell):

```powershell
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh ADMIN@IP_DEL_SERVIDOR "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

Compruebe que entra **con la clave** (no debe pedir la contraseña de la
cuenta, solo la frase de paso de la clave si le puso una):

```bash
ssh ADMIN@IP_DEL_SERVIDOR
```

### 1.4 SSH solo con clave y sin root

Ya dentro como `ADMIN`:

```bash
sudo tee /etc/ssh/sshd_config.d/00-endurecido.conf > /dev/null <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
EOF
sudo sshd -t && sudo systemctl restart ssh
sudo sshd -T | grep -E '^(passwordauthentication|kbdinteractiveauthentication|permitrootlogin) '
```

Debe mostrar `passwordauthentication no`, `kbdinteractiveauthentication no` y
`permitrootlogin no`. El nombre `00-...` importa: sshd usa el **primer** valor
que lee y muchas imágenes traen `50-cloud-init.conf` con
`PasswordAuthentication yes`.

**Antes de cerrar la sesión actual**, abra otra terminal y confirme que
`ssh ADMIN@IP_DEL_SERVIDOR` sigue entrando. Si algo falla, corrija desde la
sesión que sigue abierta.

---

## 2. Cortafuegos, actualizaciones y hora

### 2.1 Cortafuegos: solo 22, 80 y 443

```bash
sudo apt-get update
sudo apt-get install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp        # HTTP/3
sudo ufw enable
sudo ufw status verbose
```

Si el proveedor tiene además un cortafuegos en su panel, abra ahí los mismos
puertos (22, 80, 443).

> Docker publica puertos por su cuenta, sin pasar por ufw. Por eso en el
> servidor **solo** Caddy publica puertos (80 y 443) y db/api no publican
> ninguno. No use `docker-compose.dev.yml` en el servidor: publica la base.

### 2.2 Parches de seguridad automáticos

```bash
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades     # responda "Sí"
sudo apt-get upgrade -y
```

Algunos parches (del kernel) piden reiniciar: si existe
`/var/run/reboot-required`, reinicie en un momento tranquilo con
`sudo reboot`. Los contenedores vuelven solos (`restart: unless-stopped`).

### 2.3 Zona horaria (la hora de los respaldos)

```bash
sudo timedatectl set-timezone America/Guatemala
timedatectl
```

---

## 3. Memoria de intercambio (swap)

Con 2 GB de RAM, 2 GB de swap evitan que la compilación de las imágenes o un
pico agoten la memoria:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swap.conf
sudo sysctl --system > /dev/null
free -h
```

`free -h` debe mostrar `Swap: 2.0Gi`. Si ya había swap (`swapon --show`),
omita este paso.

Memoria de los contenedores (límites en `docker-compose.yml`): db 512 MiB,
api 768 MiB, web 64 MiB y caddy 128 MiB, 1.47 GiB en total. En uso normal
ocupan unos 500 MiB (picos medidos: api ~580, db ~300, caddy ~30, web ~20).

---

## 4. Docker

Instalación desde el repositorio oficial de Docker:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Permita a `ADMIN` usar Docker sin `sudo` (necesario para el cron de
respaldos) y vuelva a entrar para que tome efecto:

```bash
sudo usermod -aG docker ADMIN
exit
```

```bash
ssh ADMIN@IP_DEL_SERVIDOR
docker version --format '{{.Server.Version}}'      # 24 o más
docker compose version                              # v2.24 o más
docker run --rm hello-world
```

> El grupo `docker` equivale a root en esa máquina: no añada otros usuarios.

---

## 5. Código, artefactos y `.env`

### 5.1 Clonar

```bash
cd ~
git clone https://github.com/Sheila-Amaya/crash-severity-predictor.git
cd crash-severity-predictor
```

### 5.2 Modelo y semilla de la base

**El semilla.dump contiene los límites de IDEG: no lo publiques en una Release pública; copia los archivos al servidor con scp.**

Desde su equipo, copie la semilla al servidor:

```bash
scp db/seed/semilla.dump ADMIN@IP_DEL_SERVIDOR:crash-severity-predictor/db/seed/   # en su equipo
```

Luego, en el servidor, el script verifica la semilla y descarga el modelo del
GitHub Release, comparando cada archivo con `SHA256SUMS`; si una huella no
coincide, descarta el archivo y termina con error:

```bash
bash scripts/descargar-artefactos.sh
```

Debe terminar con `Listo: artefactos verificados contra SHA256SUMS.` Para otra
versión o una copia propia: `--url https://.../releases/download/<etiqueta>`
(ver [db/seed/LEEME.md](../db/seed/LEEME.md)).

### 5.3 `.env` con contraseñas generadas en el servidor

Las contraseñas se generan **aquí, en el servidor**. No reutilice las de su
equipo ni las copie por chat o correo.

```bash
cp .env.example .env
chmod 600 .env
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 32)/" .env
sed -i "s/^APP_DB_PASSWORD=.*/APP_DB_PASSWORD=$(openssl rand -hex 32)/" .env
sed -i '/^DB_URL=/d' .env          # solo para desarrollo fuera de Docker
cat >> .env <<'EOF'

DOMINIO=severidad.ejemplo.org
COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml
EOF
```

Cambie `severidad.ejemplo.org` por su dominio (`nano .env`). Con
`COMPOSE_FILE` no hace falta repetir `-f docker-compose.yml -f
docker-compose.prod.yml` en cada comando: `docker compose ...` ya usa el modo
servidor.

Compruebe sin mostrar las contraseñas:

```bash
grep -E '^(POSTGRES_PASSWORD|APP_DB_PASSWORD)=' .env | sed 's/=.*/=***  (definida)/'
grep -E '^(DOMINIO|COMPOSE_FILE)=' .env
docker compose config --services     # debe listar caddy, web, api y db
```

---

## 6. DNS

En el panel de su dominio cree un registro:

| Tipo | Nombre | Valor |
|---|---|---|
| `A` | `severidad` (o `@` para el dominio raíz) | `IP_DEL_SERVIDOR` |

Si el servidor tiene IPv6, añada también un `AAAA` con esa dirección; si no,
no cree ninguno (un `AAAA` incorrecto rompe el certificado).

Espere a que resuelva **antes de arrancar** (Caddy pide el certificado al
iniciar y la autoridad limita los intentos fallidos):

```bash
getent hosts severidad.ejemplo.org      # debe mostrar IP_DEL_SERVIDOR
```

---

## 7. Arranque y verificación de HTTPS

```bash
docker compose up -d --build
```

La primera vez compila las imágenes (varios minutos), restaura la semilla
(alrededor de un minuto) y obtiene el certificado. Siga el progreso:

```bash
docker compose ps                         # db, api y web "healthy"; caddy "Up"
docker compose logs caddy | grep -iE 'certificate obtained|error'
```

Debe aparecer `certificate obtained successfully` para su dominio.

Verificación completa (páginas, conteos, una predicción, CSP, HSTS,
redirección de HTTP a HTTPS, `/docs` en 404 y que db/api no publiquen
puertos):

```bash
bash scripts/docker/verificar_despliegue.sh https://severidad.ejemplo.org
```

Debe terminar con `Todo correcto.` Comprobaciones a mano, si quiere:

```bash
curl -sI https://severidad.ejemplo.org | grep -iE '^(HTTP|strict-transport|content-security)'
curl -sI http://severidad.ejemplo.org | grep -iE '^(HTTP|location)'     # 308 hacia https
sudo ss -tlnp | grep -E ':(80|443|5432|8000|8080)\b'                    # solo 80 y 443
```

Límites de peticiones (opcional: lo bloqueará unos segundos). Tras unas 31
peticiones seguidas a `/api` aparecen respuestas 429:

```bash
for i in $(seq 60); do curl -s -o /dev/null -w '%{http_code}\n' https://severidad.ejemplo.org/api/resumen & done | sort | uniq -c; wait
```

Abra el sitio en el navegador: candado válido, mapa, `/acerca` y
`/simulador`.

---

## 8. Respaldos automáticos

`scripts/docker/respaldar.sh` crea un `pg_dump`, comprueba que se lee y que su
SHA-256 coincide tras copiarlo, lo restaura en una base temporal para comparar
los conteos y solo entonces lo guarda y poda los viejos (7 diarios en
`respaldos/diarios/`, 4 semanales en `respaldos/semanales/`). Si algo falla,
no guarda nada y sale con código 1.

Pruébelo una vez a mano:

```bash
bash scripts/docker/respaldar.sh
ls -lh respaldos/diarios/
```

Instale el cron (diario a las 03:30; ver
[deploy/cron/respaldos.crontab](../deploy/cron/respaldos.crontab)):

```bash
sed "s|/home/ADMIN/crash-severity-predictor|$HOME/crash-severity-predictor|g" deploy/cron/respaldos.crontab > /tmp/respaldos.crontab
(crontab -l 2>/dev/null; cat /tmp/respaldos.crontab) | crontab -
rm /tmp/respaldos.crontab
crontab -l
```

Al día siguiente, revise el registro:

```bash
tail -n 20 respaldos/respaldar.log      # debe terminar en "Respaldo completo"
grep -c ERROR respaldos/respaldar.log   # 0 si nunca falló
```

**Copie los respaldos fuera del servidor** (un respaldo en el mismo disco no
protege de perder ese disco). Desde su equipo, por ejemplo una vez por semana:

```bash
rsync -av ADMIN@IP_DEL_SERVIDOR:crash-severity-predictor/respaldos/ ./respaldos-servidor/   # en su equipo
```

Restaurar un respaldo en la base de la app (reemplaza las tablas en una sola
transacción; pide escribir `RESTAURAR`):

```bash
bash scripts/docker/restaurar.sh respaldos/diarios/respaldo-AAAAMMDD-HHMMSS.dump
```

Probar un respaldo sin tocar la base de la app:

```bash
bash scripts/docker/probar_restauracion.sh respaldos/diarios/respaldo-AAAAMMDD-HHMMSS.dump
```

---

## 9. Actualizar y volver atrás

### 9.1 Actualizar

```bash
cd ~/crash-severity-predictor
bash scripts/docker/respaldar.sh               # respaldo antes de cambiar nada
git rev-parse --short HEAD > ~/version-anterior.txt
git fetch
git log --oneline HEAD..@{u}                   # qué cambia
git pull --ff-only
bash scripts/descargar-artefactos.sh           # solo descarga si cambió SHA256SUMS
docker compose up -d --build
bash scripts/docker/verificar_despliegue.sh https://severidad.ejemplo.org
docker image prune -f                          # borra imágenes viejas sin uso
```

La base y los certificados viven en volúmenes y se conservan. Para recoger
también parches de las imágenes base (nginx, Python, PostGIS, Caddy), de vez
en cuando:

```bash
docker compose build --pull && docker compose up -d
```

Si una actualización cambia los límites del rol de la base
(`db/docker/30_limites_app_lectura.sql`), aplíquelos a la base existente:

```bash
docker compose exec -T db psql -U postgres -d severidad_vial -v ON_ERROR_STOP=1 \
  -f /docker-entrypoint-initdb.d/30_limites_app_lectura.sql
docker compose restart api
```

### 9.2 Volver a la versión anterior

```bash
cd ~/crash-severity-predictor
git switch --detach "$(cat ~/version-anterior.txt)"
bash scripts/descargar-artefactos.sh --forzar  # artefactos de esa versión
docker compose up -d --build
bash scripts/docker/verificar_despliegue.sh https://severidad.ejemplo.org
```

Si además hay que devolver los datos, restaure el respaldo hecho antes de
actualizar (`restaurar.sh`, sección 8). Para volver a la rama principal cuando
el problema esté resuelto: `git switch main && git pull --ff-only` y repita
9.1.

> **No use `docker compose down -v`** en el servidor: `-v` borra la base
> (volumen `pgdata`) **y** los certificados (`caddy_data`). Para detener sin
> perder nada: `docker compose down`.

---

## 10. Problemas frecuentes

- **Caddy no obtiene el certificado** (`docker compose logs caddy`):
  - el DNS aún no apunta al servidor (`getent hosts severidad.ejemplo.org`);
  - los puertos 80/443 están cerrados en ufw o en el cortafuegos del proveedor;
  - hay un `AAAA` (IPv6) que no apunta a este servidor.

  Corrija y reinicie con `docker compose restart caddy`.
- **`required variable DOMINIO is missing a value`**: falta `DOMINIO` en `.env`
  (o `docker compose` se ejecutó fuera de la carpeta del repo).
- **502 o la página no carga**: `docker compose ps` y
  `docker compose logs --tail 50 web api`. web espera a que api esté sana, y
  api a que db tenga los datos.
- **El contenedor db se detiene con "falta db/seed/semilla.dump"** (o "el
  SHA-256 no coincide"): ejecute `bash scripts/descargar-artefactos.sh` y luego
  `docker compose up -d`.
- **`/api/predecir` responde 503**: falta `data/models/random_forest.pkl`
  (`bash scripts/descargar-artefactos.sh`) y luego `docker compose restart api`.
- **Usuarios reciben 429 con uso normal** (p. ej. muchas personas detrás de la
  misma IP de una institución): suba `rate` o `burst` en `frontend/nginx.conf`
  (`limit_req_zone` y `limit_req`) y reconstruya con
  `docker compose up -d --build web`.
- **Memoria**: `docker stats --no-stream` y `free -h`. Si un contenedor llega a
  su límite, Docker lo reinicia; el registro lo muestra con
  `docker compose ps -a` y `docker inspect --format '{{.State.OOMKilled}}' <contenedor>`.
- **Disco**: `df -h` y `docker system df`. Los registros de Docker rotan
  (3 x 10 MB por servicio); `docker image prune -f` libera imágenes viejas.

---

## 11. Referencia del stack de Docker

Vale para el servidor y para el modo local (`docker compose up -d --build`,
app en `http://localhost:8080`).

### Servicios

- **db** (`postgis/postgis:17-3.5`): con el volumen vacío,
  `db/docker/20_semilla.sh` verifica el SHA-256 de la semilla, la restaura,
  crea el rol `app_lectura` (solo `CONNECT` y `SELECT`, transacciones de solo
  lectura) y comprueba los conteos (71,942 víctimas, 13,741 fallecidos, 58,201
  lesionados, 52,488 hechos). Si falta la semilla o algo no cuadra, se detiene
  con un mensaje claro. El rol tiene `statement_timeout` de 10 s y un máximo de
  20 conexiones (`db/docker/30_limites_app_lectura.sql`). No publica puertos.
- **api** (`Dockerfile`, Python 3.14.0, scikit-learn 1.8.0): usuario no root y
  `HEALTHCHECK` a `/`. El modelo `data/models/random_forest.pkl` se monta como
  volumen de solo lectura; el build comprueba que el `.pkl` y SHAP cargan con
  las versiones de la imagen. Si falta, la API arranca, lo indica en su log y
  `/api/predecir` responde 503. No publica puertos ni tiene salida a internet.
- **web** (`frontend/Dockerfile`, nginx):
  - sirve la SPA (con `/simulador` y `/acerca` recargables) y hace proxy de
    `/api` a la API (mismo origen, sin CORS);
  - gzip y caché inmutable para `/assets/`;
  - cabeceras de seguridad: CSP con el hash del script del tema, `nosniff`,
    `Referrer-Policy`, `X-Frame-Options: DENY` y `Cross-Origin-Opener-Policy`;
  - límites por IP: 10 peticiones/s en `/api` (ráfaga 30) y 30/min en
    `POST /api/predecir` (ráfaga 10), con respuesta 429; cuerpo máximo 4 KB;
  - `/docs`, `/redoc` y `/openapi.json` responden 404.
- **caddy** (solo con `docker-compose.prod.yml`): TLS automático para
  `DOMINIO`, redirección de HTTP a HTTPS y HSTS; único servicio con puertos.

Todos tienen `restart: unless-stopped`, registros con rotación (3 x 10 MB) y
límite de memoria (db 512 MiB, api 768 MiB, web 64 MiB, caddy 128 MiB).

### Variables (`.env`)

| Variable | Obligatoria | Uso |
|---|---|---|
| `POSTGRES_PASSWORD` | Sí | Superusuario `postgres` del contenedor db. |
| `APP_DB_PASSWORD` | Sí | Rol `app_lectura` (solo `SELECT`) con el que se conecta la API. Solo letras y números: va dentro de una URL. |
| `POSTGRES_DB` | No | Nombre de la base (por defecto `severidad_vial`). |
| `WEB_PORT` | No | Puerto del host donde escucha nginx en modo local (por defecto `8080`). |
| `DOMINIO` | Con `docker-compose.prod.yml` | Dominio público que Caddy sirve por HTTPS. |
| `DB_PUERTO_LOCAL` | No | Puerto de `127.0.0.1` para la base en desarrollo (por defecto `5433`). |
| `DB_URL` | Desarrollo | Conexión de la API fuera de Docker (uvicorn a mano y `pytest -m integration`). `dev.ps1` la arma sola. |
| `CORS_ORIGINS` | No | Orígenes permitidos, separados por coma. Vacío = ninguno; `*` se ignora. |

Si falta una obligatoria, Compose se detiene con un mensaje que la nombra.
Genere contraseñas con `openssl rand -hex 24`.

### Operación

```bash
docker compose ps                      # estado y salud
docker compose logs -f api             # logs de web, api o db (sin cadenas de conexión)
docker compose restart api             # reiniciar un servicio
docker compose down                    # detener (conserva los datos)
docker compose down -v                 # detener Y BORRAR la base (volumen pgdata)
docker compose up -d --build           # tras un git pull: reconstruye api y web
```

La semilla solo se usa con el volumen vacío. Para cargar datos nuevos en una
base existente, use `restaurar.sh` (sección 8).

`docker-compose.dev.yml` es solo para desarrollo: publica la base en
`127.0.0.1`. Si después levanta el stack completo sin ese override, Compose
recrea el contenedor `db` sin el puerto; los datos están en el volumen.

En Windows, `scripts/docker/respaldar.ps1` y `restaurar.ps1` son las versiones
manuales de PowerShell (un archivo en `respaldos/`, sin retención; en
`restaurar.ps1`, `-Confirmado` omite la pregunta).

### Problemas frecuentes en local

- **`required variable POSTGRES_PASSWORD is missing a value`**: falta la
  variable en `.env`, o se ejecutó `docker compose` fuera de la raíz del repo.
- **El contenedor db se detiene con "conteos inesperados"** (o una semilla
  corregida no se carga): corrija la semilla y luego ejecute
  `docker compose down -v` y `docker compose up -d`. El `-v` es necesario: el
  volumen quedó inicializado a medias y, si no, la carga no se repite.
- **`Bind for 0.0.0.0:8080 failed: port is already allocated`**: otro programa
  usa el puerto; cambie `WEB_PORT` en `.env`.
- **`dev.ps1`: "Docker no está corriendo"**: abra Docker Desktop y espere a
  que diga *Engine running*.
- **Puerto 5433 ocupado** (`dev.ps1` o `docker compose ... up -d db`): cambie
  `DB_PUERTO_LOCAL` en `.env` (y el puerto de `DB_URL`).
- **`pytest -m integration` falla con "connection refused"**: la base local no
  está publicada; ejecute `.\dev.ps1 -SoloBase` y compruebe que `DB_URL` en
  `.env` apunte a `127.0.0.1` y a ese puerto.
- **Cambié `APP_DB_PASSWORD` y la API ya no conecta**: la contraseña del rol se
  fija al crear el volumen. Cámbiela también en la base con
  `docker compose exec db psql -U postgres -d severidad_vial -c "ALTER ROLE app_lectura PASSWORD '<nueva>'"`.
- **Errores raros (`$'\r'`) al correr los `.sh` en Linux**: el archivo tiene
  saltos de línea de Windows. `.gitattributes` los fija en LF; vuelva a
  obtenerlos con `git checkout -- scripts db`.
