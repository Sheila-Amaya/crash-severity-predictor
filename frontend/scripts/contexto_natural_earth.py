"""
Genera src/data/contexto-region.json: contexto geográfico del mapa (países
vecinos y fronteras terrestres) a partir de Natural Earth 1:50m (dominio
público, https://www.naturalearthdata.com/about/terms-of-use/).

Se ejecuta una sola vez (no en tiempo de ejecución de la app):

    curl -L -o ne_50m_admin_0_countries.geojson \
      https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson
    curl -L -o ne_50m_admin_0_boundary_lines_land.geojson \
      https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_boundary_lines_land.geojson
    python scripts/contexto_natural_earth.py <carpeta de los .geojson> src/data/contexto-region.json

Recorta a la región (lon -95 a -83, lat 8 a 20), simplifica (0.004°) y
redondea a 3 decimales (~100 m) para quedar por debajo de ~300 KB.
"""

import json
import sys
from pathlib import Path

from shapely.geometry import box, mapping, shape

REGION = box(-95, 8, -83, 20)
TOLERANCIA = 0.004
DECIMALES = 3

# Vecinos + Guatemala como "tierra" de fondo (encima van los límites de IDEG)
PAISES = {
    "MEX": "México",
    "BLZ": "Belice",
    "HND": "Honduras",
    "SLV": "El Salvador",
    "NIC": "Nicaragua",
    "GTM": "Guatemala",
}


def redondear(coordenadas):
    if isinstance(coordenadas[0], (int, float)):
        return [round(coordenadas[0], DECIMALES), round(coordenadas[1], DECIMALES)]
    return [redondear(c) for c in coordenadas]


def recortar(geometria):
    g = shape(geometria).intersection(REGION)
    if g.is_empty:
        return None
    g = g.simplify(TOLERANCIA, preserve_topology=True)
    if g.is_empty:
        return None
    m = mapping(g)
    return {"type": m["type"], "coordinates": redondear(m["coordinates"])}


def main(carpeta: Path, salida: Path) -> None:
    paises = json.loads((carpeta / "ne_50m_admin_0_countries.geojson").read_text(encoding="utf-8"))
    fronteras = json.loads((carpeta / "ne_50m_admin_0_boundary_lines_land.geojson").read_text(encoding="utf-8"))

    features = []

    for f in paises["features"]:
        iso = f["properties"].get("ADM0_A3")
        if iso not in PAISES:
            continue
        geometria = recortar(f["geometry"])
        if geometria:
            features.append({
                "type": "Feature",
                "properties": {"capa": "pais", "iso": iso, "nombre": PAISES[iso]},
                "geometry": geometria,
            })

    for f in fronteras["features"]:
        geometria = recortar(f["geometry"])
        if geometria and geometria["type"] in ("LineString", "MultiLineString"):
            features.append({"type": "Feature", "properties": {"capa": "frontera"}, "geometry": geometria})

    coleccion = {
        "type": "FeatureCollection",
        "fuente": "Natural Earth 1:50m v5.1.2 (dominio público) — recorte lon -95..-83, lat 8..20",
        "features": features,
    }
    salida.write_text(json.dumps(coleccion, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{salida}: {len(features)} features, {salida.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
