"""
Genera el contexto geográfico del mapa a partir de Natural Earth (dominio
público, https://www.naturalearthdata.com/about/terms-of-use/):

- src/data/contexto-region.json  (1:50m) Centroamérica, sur de México y el
  Caribe cercano (lon -100..-76, lat 5..24). Va en el bundle principal.
- src/data/contexto-detalle.json (1:10m) México, Belice, Honduras, El Salvador
  y la silueta de Guatemala alrededor del país (lon -95..-86, lat 12.5..19.5).
  Se carga en diferido (chunk aparte) al acercar.

Se ejecuta una sola vez (no en tiempo de ejecución de la app):

    BASE=https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson
    curl -L -O $BASE/ne_50m_admin_0_countries.geojson
    curl -L -O $BASE/ne_50m_admin_0_boundary_lines_land.geojson
    curl -L -O $BASE/ne_10m_admin_0_countries.geojson
    curl -L -O $BASE/ne_10m_admin_0_boundary_lines_land.geojson
    python scripts/contexto_natural_earth.py <carpeta de los .geojson> src/data

Coherencia con IDEG en la frontera:
- La silueta de Guatemala de Natural Earth se dibuja como "tierra" bajo los
  límites de IDEG, para que los desajustes entre ambas fuentes no dejen huecos.
- Los tramos de frontera de Natural Earth a menos de ~3 km de Guatemala se
  marcan "gtm" y no se dibujan: ahí manda el límite de IDEG.
- Los rasgos 1:50m que caen dentro de la caja de detalle se marcan "detalle"
  y se ocultan cuando el 1:10m está cargado.
"""

import json
import sys
from pathlib import Path

from shapely.geometry import box, mapping, shape
from shapely.ops import unary_union

REGION = box(-100, 5, -76, 24)
CAJA_DETALLE = box(-95, 12.5, -86, 19.5)
CERCA_DE_GUATEMALA = 0.03  # grados (~3 km)

DETALLE = {"MEX", "BLZ", "HND", "SLV", "GTM"}

AJUSTES = {
    "50m": {"tolerancia": 0.006, "decimales": 3},
    "10m": {"tolerancia": 0.0012, "decimales": 4},
}


def redondear(coordenadas, decimales):
    if isinstance(coordenadas[0], (int, float)):
        return [round(coordenadas[0], decimales), round(coordenadas[1], decimales)]
    return [redondear(c, decimales) for c in coordenadas]


def geometria(g, escala):
    if g.is_empty:
        return None
    a = AJUSTES[escala]
    g = g.simplify(a["tolerancia"], preserve_topology=True)
    if g.is_empty:
        return None
    m = mapping(g)
    if m["type"] == "GeometryCollection":
        return None
    return {"type": m["type"], "coordinates": redondear(m["coordinates"], a["decimales"])}


def feature(props, g, escala):
    geo = geometria(g, escala)
    return {"type": "Feature", "properties": props, "geometry": geo} if geo else None


def cargar(carpeta, nombre):
    return json.loads((carpeta / f"{nombre}.geojson").read_text(encoding="utf-8"))["features"]


def nombre_es(props):
    return props.get("NAME_ES") or props.get("NAME") or props.get("ADMIN")


def paises(carpeta, escala, recorte, isos=None):
    salida = []
    for f in cargar(carpeta, f"ne_{escala}_admin_0_countries"):
        iso = f["properties"].get("ADM0_A3")
        if isos is not None and iso not in isos:
            continue
        g = shape(f["geometry"]).intersection(recorte)
        if not g.is_empty:
            salida.append((iso, nombre_es(f["properties"]), g))
    return salida


def lineas(carpeta, escala, recorte):
    return [shape(f["geometry"]).intersection(recorte) for f in cargar(carpeta, f"ne_{escala}_admin_0_boundary_lines_land")]


def partir_fronteras(lineas_, guatemala, escala, base_props):
    """Separa los tramos cercanos a Guatemala (gtm: true) del resto."""
    cerca = guatemala.boundary.buffer(CERCA_DE_GUATEMALA)
    salida = []
    for l in lineas_:
        if l.is_empty:
            continue
        for parte, es_gtm in ((l.difference(cerca), False), (l.intersection(cerca), True)):
            f = feature({**base_props, "capa": "frontera", "gtm": es_gtm}, parte, escala)
            if f:
                salida.append(f)
    return salida


def escribir(ruta, features, fuente):
    coleccion = {"type": "FeatureCollection", "fuente": fuente, "features": [f for f in features if f]}
    ruta.write_text(json.dumps(coleccion, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{ruta}: {len(coleccion['features'])} features, {ruta.stat().st_size / 1024:.0f} KB")


def main(carpeta: Path, destino: Path) -> None:
    # -- 1:50m, toda la región -------------------------------------------
    paises_50 = paises(carpeta, "50m", REGION)
    guatemala_50 = unary_union([g for iso, _, g in paises_50 if iso == "GTM"])

    region = []
    for iso, nombre, g in paises_50:
        if iso in DETALLE:
            # Lo que cae en la caja de detalle se sustituye por el 1:10m
            region.append(feature({"capa": "pais", "iso": iso, "nombre": nombre, "detalle": True}, g.intersection(CAJA_DETALLE), "50m"))
            region.append(feature({"capa": "pais", "iso": iso, "nombre": nombre, "detalle": False}, g.difference(CAJA_DETALLE), "50m"))
        else:
            region.append(feature({"capa": "pais", "iso": iso, "nombre": nombre, "detalle": False}, g, "50m"))

    lineas_50 = lineas(carpeta, "50m", REGION)
    dentro = [l.intersection(CAJA_DETALLE) for l in lineas_50]
    fuera = [l.difference(CAJA_DETALLE) for l in lineas_50]
    region += partir_fronteras(dentro, guatemala_50, "50m", {"detalle": True})
    region += partir_fronteras(fuera, guatemala_50, "50m", {"detalle": False})

    escribir(destino / "contexto-region.json", region,
             "Natural Earth 1:50m v5.1.2 (dominio público) — lon -100..-76, lat 5..24")

    # -- 1:10m, alrededor de Guatemala --------------------------------------
    paises_10 = paises(carpeta, "10m", CAJA_DETALLE, DETALLE)
    guatemala_10 = unary_union([g for iso, _, g in paises_10 if iso == "GTM"])

    detalle = [feature({"capa": "pais", "iso": iso, "nombre": nombre}, g, "10m") for iso, nombre, g in paises_10]
    detalle += partir_fronteras(lineas(carpeta, "10m", CAJA_DETALLE), guatemala_10, "10m", {})

    escribir(destino / "contexto-detalle.json", detalle,
             "Natural Earth 1:10m v5.1.2 (dominio público) — lon -95..-86, lat 12.5..19.5")


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
