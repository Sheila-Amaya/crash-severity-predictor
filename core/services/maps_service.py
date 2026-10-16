import json
import logging

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


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
