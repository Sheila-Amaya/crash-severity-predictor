# Frontend — Severidad vial Guatemala

Vite 6 + React + TypeScript, Tailwind, TanStack Query, Zustand, Recharts y
MapLibre GL. (Guía completa de instalación y uso: etapa g.)

```bash
npm install
cp .env.example .env     # VITE_API_URL, sin secretos
npm run dev              # http://localhost:5173 (proxy /api -> VITE_API_URL)
npm run build && npm run lint && npm test && npm run contraste
```

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
    lat 5…24) en `src/data/contexto-region.json` (~34 KB, en el bundle).
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
