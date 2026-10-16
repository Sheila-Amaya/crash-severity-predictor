# Frontend — Severidad vial Guatemala

Aplicación web del proyecto: un **mapa de víctimas de hechos de tránsito** de
Guatemala (INE 2018–2024) por departamento y municipio, con filtros, series y
ranking; un **simulador** que estima si una víctima resultaría fallecida o
lesionada y explica la estimación con SHAP; y una página **Acerca de** con los
datos, el modelo y su uso responsable.

Consume la API FastAPI de este repositorio (ver el [README de la raíz](../README.md)).

| Mapa | Simulador |
|---|---|
| ![Mapa de víctimas por departamento, tema oscuro](../docs/capturas/mapa.webp) | ![Simulador con un resultado y sus factores SHAP](../docs/capturas/simulador.webp) |

## Requisitos

- **Node.js 20, 22 o 24+** (`engines` en `package.json`; Vitest 4 y React
  Router 7 no admiten Node 18). Probado con Node 20.18.1 y npm 10.8.2.
- La API en marcha (por defecto en `http://localhost:8000`).

## Instalación

```bash
cd frontend
npm install
cp .env.example .env      # Windows: copy .env.example .env
```

## Variables de entorno

| Variable | Por defecto | Uso |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | **Desarrollo:** destino del proxy de `/api`. **Producción:** URL pública de la API, fijada al compilar (sin barra final; si se pone, se quita). Vacía en producción = la API está en el mismo dominio que el frontend. |

Las variables `VITE_*` quedan incrustadas en el JavaScript que recibe el
navegador: **nunca pongas secretos en ellas**. El frontend no necesita
credenciales; la conexión a la base vive solo en la API.

## Cómo levantarlo

**Con la API en otra terminal** (desde la raíz del repo):

```bash
uvicorn core.app:app --reload        # API en http://localhost:8000
cd frontend && npm run dev           # http://localhost:5173
```

**En Windows, todo de una vez:** `.\dev.ps1` (en la raíz) abre dos ventanas de
PowerShell, una con la API (con el `.venv` activado) y otra con `npm run dev`.

En desarrollo el navegador llama a `/api/...` en el mismo origen y Vite lo
reenvía a `VITE_API_URL`: no hace falta configurar CORS.

### Compilación para producción

```bash
VITE_API_URL=https://api.ejemplo.org npm run build   # PowerShell: $env:VITE_API_URL='https://api.ejemplo.org'; npm run build
npm run preview                                      # sirve dist/ en http://localhost:4173
```

`dist/` es un sitio estático. Al publicarlo:

- La API debe permitir el origen del frontend en `CORS_ORIGINS` (o servirse en
  el mismo dominio, con `VITE_API_URL` vacía).
- El servidor estático debe devolver `index.html` para rutas desconocidas
  (`/simulador`, `/acerca`): la aplicación usa rutas del navegador.
- Un `.env` local con `VITE_API_URL=http://localhost:8000` también afecta a
  `npm run build`; para producción usa la variable de entorno o un
  `.env.production`.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente (puerto 5173) y proxy a la API. |
| `npm run build` | Comprueba tipos (`tsc -b`) y compila a `dist/`. |
| `npm run preview` | Sirve el build de `dist/` (puerto 4173). |
| `npm run lint` | ESLint (TypeScript, reglas de hooks de React). |
| `npm test` | Pruebas con Vitest y Testing Library (jsdom). |
| `npm run contraste` | Verifica el contraste WCAG AA de la paleta en ambos temas; sale con código 1 si algo no cumple. |

## Estructura

```
frontend/
├── index.html              # título, descripción, favicon y tema inicial (sin destello)
├── vite.config.ts          # proxy de /api, chunks y favicon.svg generado
├── scripts/
│   ├── contraste.mjs        # npm run contraste
│   └── contexto_natural_earth.py  # genera src/data/contexto-*.json
└── src/
    ├── main.tsx             # React Query, router, fuentes y tema
    ├── App.tsx              # rutas (cada página se carga bajo demanda)
    ├── proyecto.ts          # URL del repositorio: icono del encabezado y pie de "Acerca de"
    ├── api/                 # cliente fetch, tipos y hooks de React Query
    ├── components/
    │   ├── Layout.tsx       # barra superior, interruptor de tema
    │   ├── mapa/            # mapa MapLibre, fichas de filtros, KPIs, leyenda, panel de datos
    │   ├── dashboard/       # serie temporal y ranking (Recharts)
    │   ├── simulador/       # formulario, resultado con SHAP y ayuda
    │   └── ui/              # piezas editoriales, estados de carga/error, hojas inferiores
    ├── pages/               # Panel (mapa), Simulador, Acerca
    ├── state/               # filtros (Zustand) sincronizados con la URL
    ├── hooks/               # media queries, movimiento reducido, título de página
    ├── theme/               # palette.json (oscuro y claro), tema.ts y logo.ts
    ├── utils/               # clasificación, geometría, espacio libre, formato, simulador
    └── data/                # contexto geográfico de Natural Earth
```

## Decisiones de diseño

- **Paleta única** en `src/theme/palette.json`. `tema.ts` la vuelca a
  variables CSS (`--c-*`) que comparten Tailwind, Recharts y MapLibre; ningún
  componente define colores propios. `npm run contraste` verifica texto (4.5:1),
  elementos gráficos (3:1), las cifras dentro de las burbujas y que la escala
  del mapa sea monótona en luminancia (se lee en escala de grises).
- **Temas:** el **oscuro** es el principal. El **claro** es opcional: se activa
  con el interruptor de la barra superior, la elección se recuerda en el
  navegador y, si no hay elección previa, se sigue `prefers-color-scheme`.
  Al cambiar de tema el mapa se vuelve a dibujar con los colores del tema.
- **Logotipo:** un punto con dos anillos concéntricos que recuerdan las
  burbujas del mapa (`components/ui/Logotipo.tsx`), en el color de acento del
  tema activo; el anillo exterior late despacio salvo con
  `prefers-reduced-motion`. Su geometría vive en `theme/logo.ts`, y de ahí y de
  `palette.json` se genera `favicon.svg` al compilar (y en `npm run dev`), con
  variante para `prefers-color-scheme: light`.
- **Tipografías** autoalojadas (sin peticiones a terceros): **Inter** para el
  texto y **JetBrains Mono** para etiquetas técnicas y cifras tabulares.
- **Mapa:** fondo liso sin teselas externas; burbujas en el centroide de cada
  área (resumen territorial, no ubicación exacta), vista de áreas y 3D. Los
  colores son quintiles de los datos visibles.
- **Enlaces externos:** el único es el repositorio en GitHub (icono del
  encabezado y pie de "Acerca de"), en una pestaña nueva con
  `rel="noopener noreferrer"`. Sale de `REPOSITORIO` en `src/proyecto.ts`.
- **Accesibilidad:** foco visible, navegación por teclado (el ranking permite
  recorrer el mapa sin ratón), regiones `aria-live`, `prefers-reduced-motion`.
- **Carga:** cada página es un chunk aparte; MapLibre (≈1 MB) y Recharts solo
  se descargan en la página del mapa.

## Datos cartográficos

- **Límites departamentales y municipales:** IDEG — Infraestructura de Datos
  Espaciales de Guatemala (capas `agrip_03_Limites_departamentales` y
  `agrip_04_Limites_municipales_340`, en `data/IDEG/`). Los archivos son
  exportaciones GeoJSON sin metadatos de licencia: **la licencia y los términos
  de uso no están indicados en los archivos** y deben confirmarse con IDEG antes
  de publicar.
- La API sirve esas geometrías simplificadas (`/api/mapa/coropletico`).
- **Contexto geográfico (países, costa y fronteras):** Natural Earth v5.1.2,
  `admin_0_countries` y `admin_0_boundary_lines_land`. Licencia: **dominio
  público** ("All versions of Natural Earth raster + vector map data found on
  this website are in the public domain",
  https://www.naturalearthdata.com/about/terms-of-use/). Made with Natural Earth.
  - **1:50m** de Centroamérica, sur de México y Caribe cercano (lon −100…−76,
    lat 5…24) en `src/data/contexto-region.json` (~34 KB, en el chunk del mapa).
  - **1:10m** de México, Belice, Honduras, El Salvador y la silueta de
    Guatemala alrededor del país (lon −95…−86, lat 12.5…19.5) en
    `src/data/contexto-detalle.json` (~60 KB). Se carga en diferido como chunk
    aparte al acercar (zoom ≥ 7.5) y sustituye al 1:50m de esa zona.
  - Ambos se generan con `scripts/contexto_natural_earth.py` (instrucciones en
    el propio script). Ninguna descarga en tiempo de ejecución.
  - Coherencia con IDEG: la silueta de Guatemala de Natural Earth es la tierra
    de base bajo los límites de IDEG (sin huecos donde no coinciden), y los
    tramos de frontera de Natural Earth junto a Guatemala no se dibujan: ahí
    manda el límite de IDEG.
  - El mapa no se puede alejar ni desplazar fuera de esa región (`maxBounds`,
    `minZoom`).
- La retícula de latitud/longitud se genera en el propio código.
- **Sin mapa base externo:** el mapa usa un fondo liso y no descarga teselas ni
  requiere claves, por lo que funciona sin internet.
- Las burbujas se ubican en el centroide de cada polígono: son un **resumen por
  departamento o municipio**, no la ubicación exacta de cada hecho (los datos
  del INE no traen coordenadas).

## Problemas frecuentes

**La API está apagada (`ECONNREFUSED`).** La terminal de `npm run dev` muestra
`http proxy error: /api/... Error: connect ECONNREFUSED 127.0.0.1:8000` y los
paneles muestran "No se pudo cargar…" con un botón **Reintentar**. Levanta la
API (`uvicorn core.app:app --reload` o `.\dev.ps1`) y pulsa Reintentar. Si la
API usa otro puerto, ajusta `VITE_API_URL` en `.env` y reinicia `npm run dev`.

**Error de CORS** ("blocked by CORS policy" en la consola del navegador). No
ocurre en desarrollo, porque el proxy evita peticiones a otro origen; aparece
con un build que llama a la API en otra URL. Agrega el origen exacto del
frontend (esquema, dominio y puerto, sin barra final; p. ej.
`http://localhost:4173`) a `CORS_ORIGINS` en el `.env` de la API, separado por
comas, y reinicia la API. `*` se ignora a propósito.

**Supabase pausado.** Los proyectos gratuitos se pausan tras un tiempo sin
actividad. La API arranca, pero las consultas fallan (500) y su log muestra un
error de conexión como "tenant/user not found". Restaura el proyecto desde el
panel de Supabase, espera a que quede activo y pulsa Reintentar.

**El simulador dice "El modelo no está disponible".** Falta
`data/models/random_forest.pkl` (no está en git); la API responde 503 en
`/api/predecir`. Ver el README de la raíz para generarlo.
