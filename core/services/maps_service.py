import json
import logging

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class MapsService:

    @staticmethod
    def get_departments(db: Session):
        """
        Retorna los departamentos de Guatemala como un GeoJSON
        FeatureCollection.
        """

        logger.info("Loading departments GeoJSON.")

        query = text("""
            SELECT
                dg.cod_dep,
                d.nombre,

                COUNT(DISTINCT (h.num_corre, h.anio_ocu)) AS accidentes,

                COUNT(*) FILTER (
                    WHERE fl.fall_les = 1
                ) AS fallecidos,

                COUNT(*) FILTER (
                    WHERE fl.fall_les = 2
                ) AS lesionados,

                ST_AsGeoJSON(dg.geom) AS geometry

            FROM departamento_geom dg

            INNER JOIN cat_departamento d
                ON dg.cod_dep = d.depto_ocu

            LEFT JOIN cat_municipio m
                ON m.depto_ocu = dg.cod_dep

            LEFT JOIN hecho h
                ON h.mupio_ocu = m.mupio_ocu

            LEFT JOIN fallecido_lesionado fl
                ON fl.num_corre = h.num_corre
               AND fl.anio_ocu = h.anio_ocu

            GROUP BY
                dg.cod_dep,
                d.nombre,
                dg.geom

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
        SELECT
            mg.cod_mun AS id,
            mg.cod_dep,
            cm.nombre AS municipio,

            COUNT(DISTINCT (h.num_corre, h.anio_ocu)) AS accidentes,

            COUNT(*) FILTER (
                WHERE fl.fall_les = 1
            ) AS fallecidos,

            COUNT(*) FILTER (
                WHERE fl.fall_les = 2
            ) AS lesionados,

            ST_AsGeoJSON(mg.geom) AS geometry

        FROM municipio_geom mg

        INNER JOIN cat_municipio cm
            ON mg.cod_mun = cm.mupio_ocu
           AND mg.cod_dep = cm.depto_ocu

        LEFT JOIN hecho h
            ON h.mupio_ocu = cm.mupio_ocu

        LEFT JOIN fallecido_lesionado fl
            ON fl.num_corre = h.num_corre
           AND fl.anio_ocu = h.anio_ocu

        GROUP BY
            mg.cod_mun,
            mg.cod_dep,
            cm.nombre,
            mg.geom

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