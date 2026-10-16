import logging

from sqlalchemy import text

from core.schemas.filters import FiltrosQuery
from core.services.sql_filters import condiciones_hechos, condiciones_victimas

logger = logging.getLogger(__name__)


NOTA_HECHOS_NO_DISPONIBLE = (
    "hechos es null: con filtros de víctima (tipo_veh, sexo, edad_quinquenales) "
    "no se pueden contar hechos, porque los archivos del INE no permiten "
    "vincular víctimas con hechos."
)


def calcular_letalidad(fallecidos: int, lesionados: int) -> float | None:
    """
    Letalidad = fallecidos / (fallecidos + lesionados) * 100.
    None si no hay víctimas.
    """
    victimas = fallecidos + lesionados

    if victimas == 0:
        return None

    return round(fallecidos / victimas * 100, 2)


def nota_hechos(filtros: FiltrosQuery) -> str | None:
    return NOTA_HECHOS_NO_DISPONIBLE if filtros.tiene_filtros_victima else None


def contar_victimas(db, filtros: FiltrosQuery) -> tuple[int, int]:
    condicion, params = condiciones_victimas(filtros)

    query = text(f"""
        SELECT
            COUNT(*) FILTER (WHERE v.fall_les = 1) AS fallecidos,
            COUNT(*) FILTER (WHERE v.fall_les = 2) AS lesionados
        FROM fallecido_lesionado v
        WHERE {condicion}
    """)

    row = db.execute(query, params).mappings().one()

    return int(row["fallecidos"]), int(row["lesionados"])


def contar_hechos(db, filtros: FiltrosQuery) -> int | None:
    if filtros.tiene_filtros_victima:
        return None

    condicion, params = condiciones_hechos(filtros)

    query = text(f"""
        SELECT COUNT(*)
        FROM hecho h
        WHERE {condicion}
    """)

    return int(db.execute(query, params).scalar_one())


def get_resumen(db, filtros: FiltrosQuery) -> dict:
    logger.info("Loading summary with filters %s", filtros.model_dump(exclude_none=True))

    fallecidos, lesionados = contar_victimas(db, filtros)

    return {
        "hechos": contar_hechos(db, filtros),
        "victimas": fallecidos + lesionados,
        "fallecidos": fallecidos,
        "lesionados": lesionados,
        "letalidad": calcular_letalidad(fallecidos, lesionados),
        "nota": nota_hechos(filtros),
    }
