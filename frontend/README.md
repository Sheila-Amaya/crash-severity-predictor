# Frontend

Aplicación web del proyecto (React, TypeScript, MapLibre y Tailwind): el mapa
de víctimas con filtros, ranking y evolución, el simulador de severidad y la
página Acerca de. Consume la API de este repositorio; la descripción general
está en el [README de la raíz](../README.md).

## Cómo correrlo

Requisitos: Node.js 20, 22 o 24+ y la API en marcha (por defecto en
`http://localhost:8000`). El entorno completo se levanta con `.\dev.ps1` desde
la raíz ([Desarrollo local](../README.md#desarrollo-local)). Solo el frontend:

```bash
cd frontend
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev               # http://localhost:5173
```

En desarrollo, el navegador llama a `/api/...` en el mismo origen y Vite lo
reenvía a `VITE_API_URL`, así que no hace falta CORS.

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente y proxy a la API. |
| `npm run build` | Comprueba tipos (`tsc -b`) y compila a `dist/`. |
| `npm run preview` | Sirve el build de `dist/` (puerto 4173). |
| `npm run lint` | ESLint (TypeScript y reglas de hooks de React). |
| `npm test` | Pruebas con Vitest y Testing Library. |
| `npm run contraste` | Verifica el contraste WCAG AA de la paleta en ambos temas. |

## Variables

| Variable | Por defecto | Uso |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | En desarrollo, destino del proxy de `/api`. Al compilar, URL pública de la API; vacía si la API está en el mismo dominio. |

Las variables `VITE_*` quedan incrustadas en el JavaScript que recibe el
navegador: no pongas secretos en ellas. El frontend no necesita credenciales.

Con Docker, `frontend/Dockerfile` compila con `VITE_API_URL` vacía y nginx
(`frontend/nginx.conf`) sirve la SPA y hace de proxy de `/api`
([docs/DESPLIEGUE.md](../docs/DESPLIEGUE.md)). Si publicas `dist/` en otro
servidor estático, la API debe permitir ese origen en `CORS_ORIGINS` y el
servidor debe devolver `index.html` para rutas como `/simulador` y `/acerca`.

## Estructura

```
frontend/
├── index.html              # título, descripción, favicon y tema inicial
├── vite.config.ts          # proxy de /api, chunks y favicon generado
├── nginx.conf, Dockerfile  # imagen de producción
├── scripts/                # contraste.mjs y contexto_natural_earth.py
└── src/
    ├── api/                # cliente fetch, tipos y hooks de React Query
    ├── components/         # mapa, dashboard, simulador, acerca y piezas de interfaz
    ├── pages/              # Panel (mapa), Simulador y Acerca
    ├── state/              # filtros (Zustand) sincronizados con la URL
    ├── hooks/              # media queries, movimiento reducido, título de página
    ├── theme/              # palette.json (temas oscuro y claro), tema.ts y logo.ts
    ├── utils/              # clasificación, geometría, formato y simulador
    └── data/               # contexto geográfico de Natural Earth
```

## Diseño

- **Paleta única** en `src/theme/palette.json`, compartida por Tailwind,
  Recharts y MapLibre. `npm run contraste` verifica texto, elementos gráficos y
  que la escala del mapa se lea en escala de grises.
- **Temas:** oscuro por defecto y claro opcional; la elección se recuerda en el
  navegador y, sin elección previa, se sigue `prefers-color-scheme`.
- **Mapa sin servicios externos:** fondo liso, sin teselas ni claves. Los
  límites de departamentos y municipios (IDEG/SEGEPLAN) llegan desde la API; el
  contexto de países y fronteras (Natural Earth 1:50m y 1:10m) va en
  `src/data/` y se genera con `scripts/contexto_natural_earth.py`.
- **Burbujas en el centroide** de cada área: resumen territorial, no ubicación
  exacta de cada hecho (los datos no traen coordenadas).
- **Accesibilidad:** foco visible, navegación por teclado, regiones `aria-live`
  y `prefers-reduced-motion`.
- **Carga:** cada página es un chunk aparte; MapLibre y Recharts solo se
  descargan en la página del mapa. Fuentes autoalojadas (Inter y JetBrains
  Mono).

## Problemas frecuentes

- **`ECONNREFUSED` en la terminal de `npm run dev`** y paneles con "No se pudo
  cargar…": la API está apagada. Levántala y pulsa **Reintentar**. Si usa otro
  puerto, ajusta `VITE_API_URL` y reinicia `npm run dev`.
- **"blocked by CORS policy"** con un build que llama a la API en otra URL:
  agrega el origen exacto del frontend (por ejemplo `http://localhost:4173`) a
  `CORS_ORIGINS` en el `.env` de la API y reiníciala. `*` se ignora.
- **"El modelo no está disponible"** en el simulador: la API no encuentra
  `data/models/random_forest.pkl` y responde 503. Ver
  [db/seed/LEEME.md](../db/seed/LEEME.md).
