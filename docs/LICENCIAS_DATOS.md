# Fuentes de datos y licencias

| Fuente | Qué se usa | Licencia | Cómo se cita |
|---|---|---|---|
| Instituto Nacional de Estadística (INE), Guatemala — [datos.ine.gob.gt](https://datos.ine.gob.gt) | Conjuntos "ACCIDENTES DE TRANSITO - HECHOS" y "ACCIDENTES DE TRANSITO - FALLECIDOS Y LESIONADOS", 2018–2024 | Creative Commons Atribución (CC BY) | INE Guatemala, *Accidentes de tránsito – Hechos* y *Accidentes de tránsito – Fallecidos y lesionados* (2018–2024), datos.ine.gob.gt, CC BY. Datos procesados y limpiados por la autora. |
| IDEG / SEGEPLAN — Infraestructura de Datos Espaciales de Guatemala | Límites departamentales y municipales (capas `agrip_03_Limites_departamentales` y `agrip_04_Limites_municipales_340`) | Pendiente de confirmar (consulta enviada) | Límites territoriales: IDEG/SEGEPLAN. |
| [Natural Earth](https://www.naturalearthdata.com) v5.1.2 | Países, costa y fronteras de contexto alrededor de Guatemala (`admin_0_countries`, `admin_0_boundary_lines_land`) | Dominio público | Made with Natural Earth. |

Notas:

- Los datos del INE se procesaron y limpiaron para este proyecto (ver
  [DATOS.md](DATOS.md)); las cifras publicadas no son estadísticas oficiales
  del INE.
- Los límites de IDEG se cargan en la base (`departamento_geom` y
  `municipio_geom`) y la API los sirve simplificados al mapa.
