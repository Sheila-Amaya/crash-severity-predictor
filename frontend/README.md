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
- **Contexto geográfico (países vecinos, costa y fronteras):** Natural Earth
  1:50m v5.1.2, `ne_50m_admin_0_countries` y
  `ne_50m_admin_0_boundary_lines_land`. Licencia: **dominio público** ("All
  versions of Natural Earth raster + vector map data found on this website are
  in the public domain", https://www.naturalearthdata.com/about/terms-of-use/).
  Recortado a la región (lon −95 a −83, lat 8 a 20), simplificado y guardado en
  `src/data/contexto-region.json` (~18 KB) con `scripts/contexto_natural_earth.py`;
  se incluye en el bundle (ninguna descarga en tiempo de ejecución). Made with
  Natural Earth.
- La retícula de latitud/longitud se genera en el propio código.
- **Sin mapa base externo:** el mapa usa un fondo liso y no descarga teselas ni
  requiere claves, por lo que funciona sin internet.
- Las burbujas se ubican en el centroide de cada polígono: son un **resumen por
  departamento o municipio**, no la ubicación exacta de cada hecho (los datos
  del INE no traen coordenadas).
