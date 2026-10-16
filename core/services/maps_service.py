import json
import logging

from sqlalchemy import text
from sqlalchemy.orm import Session

from core.schemas.filters import FiltrosQuery
from core.services.sql_filters import condiciones_hechos, condiciones_victimas
from core.services.stats_service import NIVELES, fila_estadistica, nota_hechos

logger = logging.getLogger(__name__)


# Simplificación de geometrías del mapa coroplético
# (grados, EPSG:4326; 0.002° ≈ 220 m) y decimales de las coordenadas.
TOLERANCIA_GRADOS = 0.002
DECIMALES_COORDENADAS = 5

# nivel -> tabla de geometría y columna de código
GEOMETRIAS = {
    "depto": ("departamento_geom", "cod_dep"),
    "municipio": ("municipio_geom", "cod_mun"),
}


# Víctimas: se agregan con las columnas propias de cada víctima
# (fallecido_lesionado.depto_ocu / mupio_ocu), nunca uniendo con hecho,
# porque num_corre no es llave compartida entre los archivos del INE.
# Hechos: se cuentan por separado con las columnas de hecho
# (el departamento es mupio_ocu / 100, código DDMM).


class MapsService:

    @staticmethod
    def get_departments(db: Session):
        """
        Retorna los departamentos de Guatemala como un GeoJSON
        FeatureCollection.
        """

        logger.info("Loading departments GeoJSON.")

        query = text("""
            WITH victimas AS (
                SELECT
                    depto_ocu AS codigo,
                    COUNT(*) FILTER (WHERE fall_les = 1) AS fallecidos,
                    COUNT(*) FILTER (WHERE fall_les = 2) AS lesionados
                FROM fallecido_lesionado
                GROUP BY depto_ocu
            ),
            hechos AS (
                SELECT
                    mupio_ocu / 100 AS codigo,
                    COUNT(*) AS accidentes
                FROM hecho
                GROUP BY mupio_ocu / 100
            )
            SELECT
                dg.cod_dep,
                d.nombre,
                COALESCE(h.accidentes, 0) AS accidentes,
                COALESCE(v.fallecidos, 0) AS fallecidos,
                COALESCE(v.lesionados, 0) AS lesionados,
                ST_AsGeoJSON(dg.geom) AS geometry

            FROM departamento_geom dg

            INNER JOIN cat_departamento d
                ON dg.cod_dep = d.depto_ocu

            LEFT JOIN victimas v
                ON v.codigo = dg.cod_dep

            LEFT JOIN hechos h
                ON h.codigo = dg.cod_dep

            ORDER BY
                dg.cod_dep;
        """)

        rows = db.execute(query).mappings().all()

        features = []

        for row in rows:
            features.append(
                {
                    "type": "Feature",
                    "geometry": json.loads(row["geometry"]),
                    "properties": {
                        "cod_dep": row["cod_dep"],
                        "nombre": row["nombre"],
                        "accidentes": row["accidentes"],
                        "fallecidos": row["fallecidos"],
                        "lesionados": row["lesionados"],
                    },
                }
            )

        logger.info("Departments loaded successfully.")

        return {
            "type": "FeatureCollection",
            "features": features,
        }


    @staticmethod
    def get_municipalities(db: Session):

        query = text("""
        WITH victimas AS (
            SELECT
                mupio_ocu AS codigo,
                COUNT(*) FILTER (WHERE fall_les = 1) AS fallecidos,
                COUNT(*) FILTER (WHERE fall_les = 2) AS lesionados
            FROM fallecido_lesionado
            GROUP BY mupio_ocu
        ),
        hechos AS (
            SELECT
                mupio_ocu AS codigo,
                COUNT(*) AS accidentes
            FROM hecho
            GROUP BY mupio_ocu
        )
        SELECT
            mg.cod_mun AS id,
            mg.cod_dep,
            cm.nombre AS municipio,
            COALESCE(h.accidentes, 0) AS accidentes,
            COALESCE(v.fallecidos, 0) AS fallecidos,
            COALESCE(v.lesionados, 0) AS lesionados,
            ST_AsGeoJSON(mg.geom) AS geometry

        FROM municipio_geom mg

        INNER JOIN cat_municipio cm
            ON mg.cod_mun = cm.mupio_ocu
           AND mg.cod_dep = cm.depto_ocu

        LEFT JOIN victimas v
            ON v.codigo = mg.cod_mun

        LEFT JOIN hechos h
            ON h.codigo = mg.cod_mun

        ORDER BY
            accidentes DESC
        """)

        rows = db.execute(query).mappings().all()

        features = []

        for row in rows:
            features.append(
                {
                    "type": "Feature",
                    "geometry": json.loads(row["geometry"]),
                    "properties": {
                        "id": row["id"],
                        "cod_dep": row["cod_dep"],
                        "municipio": row["municipio"],
                        "accidentes": row["accidentes"],
                        "fallecidos": row["fallecidos"],
                        "lesionados": row["lesionados"],
                    },
                }
            )

        return {
            "type": "FeatureCollection",
            "features": features,
        }


    @staticmethod
    def get_choropleth(db: Session, filtros: FiltrosQuery, nivel: str):
        """
        GeoJSON simplificado (ST_SimplifyPreserveTopology) para el mapa
        coroplético. Los filtros territoriales (depto, municipio) limitan
        las geometrías devueltas; el resto solo afecta los conteos.
        Todas las geometrías de la selección se devuelven, aun sin víctimas.
        """

        logger.info(
            "Loading choropleth by %s with filters %s",
            nivel, filtros.model_dump(exclude_none=True),
        )

        config = NIVELES[nivel]
        tabla_geom, codigo_geom = GEOMETRIAS[nivel]

        condicion_v, params = condiciones_victimas(filtros)

        if filtros.tiene_filtros_victima:
            hechos_cte = ""
            hechos_join = ""
            hechos_select = "NULL::bigint"
        else:
            condicion_h, params_h = condiciones_hechos(filtros)
            params.update(params_h)
            hechos_cte = f""",
                hechos AS (
                    SELECT {config["expresion_hecho"]} AS codigo, COUNT(*) AS hechos
                    FROM hecho h
                    WHERE {condicion_h}
                    GROUP BY {config["expresion_hecho"]}
                )"""
            hechos_join = f"LEFT JOIN hechos ON hechos.codigo = g.{codigo_geom}"
            hechos_select = "COALESCE(hechos.hechos, 0)"

        territorio = []
        if filtros.depto is not None:
            territorio.append("g.cod_dep = :t_depto")
            params["t_depto"] = filtros.depto
        if filtros.municipio is not None:
            if nivel == "municipio":
                territorio.append("g.cod_mun = :t_municipio")
                params["t_municipio"] = filtros.municipio
            else:
                territorio.append("g.cod_dep = :t_depto_mun")
                params["t_depto_mun"] = filtros.municipio // 100

        params["tolerancia"] = TOLERANCIA_GRADOS
        params["decimales"] = DECIMALES_COORDENADAS

        query = text(f"""
            WITH victimas AS (
                SELECT
                    v.{config["columna_victima"]} AS codigo,
                    COUNT(*) FILTER (WHERE v.fall_les = 1) AS fallecidos,
                    COUNT(*) FILTER (WHERE v.fall_les = 2) AS lesionados
                FROM fallecido_lesionado v
                WHERE {condicion_v}
                GROUP BY v.{config["columna_victima"]}
            ){hechos_cte}
            SELECT
                g.{codigo_geom} AS codigo,
                c.nombre,
                {config["depto"]} AS depto,
                COALESCE(victimas.fallecidos, 0) AS fallecidos,
                COALESCE(victimas.lesionados, 0) AS lesionados,
                {hechos_select} AS hechos,
                ST_AsGeoJSON(
                    ST_SimplifyPreserveTopology(g.geom, :tolerancia),
                    :decimales
                ) AS geometry
            FROM {tabla_geom} g
            INNER JOIN {config["catalogo"]} c
                ON c.{config["codigo"]} = g.{codigo_geom}
            LEFT JOIN victimas
                ON victimas.codigo = g.{codigo_geom}
            {hechos_join}
            WHERE {" AND ".join(territorio) or "TRUE"}
            ORDER BY g.{codigo_geom}
        """)

        rows = db.execute(query, params).mappings().all()

        features = []

        for row in rows:
            fila = fila_estadistica(int(row["fallecidos"]), int(row["lesionados"]), row["hechos"])

            features.append(
                {
                    "type": "Feature",
                    "geometry": json.loads(row["geometry"]),
                    "properties": {
                        "codigo": row["codigo"],
                        "nombre": row["nombre"],
                        "depto": row["depto"],
                        "hechos": fila["hechos"],
                        "total": fila["victimas"],
                        "fallecidos": fila["fallecidos"],
                        "lesionados": fila["lesionados"],
                        "letalidad": fila["letalidad"],
                    },
                }
            )

        return {
            "type": "FeatureCollection",
            "nivel": nivel,
            "nota": nota_hechos(filtros),
            "features": features,
        }
