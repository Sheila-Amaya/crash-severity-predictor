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
- **Sin mapa base externo:** el mapa usa un fondo liso y no descarga teselas ni
  requiere claves, por lo que funciona sin internet.
- Las burbujas se ubican en el centroide de cada polígono: son un **resumen por
  departamento o municipio**, no la ubicación exacta de cada hecho (los datos
  del INE no traen coordenadas).
