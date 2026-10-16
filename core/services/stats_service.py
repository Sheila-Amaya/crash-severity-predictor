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


def fila_estadistica(fallecidos: int, lesionados: int, hechos: int | None) -> dict:
    return {
        "hechos": hechos,
        "victimas": fallecidos + lesionados,
        "fallecidos": fallecidos,
        "lesionados": lesionados,
        "letalidad": calcular_letalidad(fallecidos, lesionados),
    }


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


# -- Serie temporal ----------------------------------------------------

MESES = (
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
)

# agrupar -> (columna común en hecho y fallecido_lesionado, catálogo de etiquetas)
AGRUPACIONES = {
    "anio": ("anio_ocu", None),
    "mes": ("mes_ocu", None),
    "dia_sem": ("dia_sem_ocu", ("cat_dia_semana", "dia_sem_ocu", "nombre")),
    "jornada": ("g_hora_5", ("cat_grupo_hora_5", "g_hora_5", "descripcion")),
}


def _etiquetas(db, agrupar: str) -> dict[int, str]:
    if agrupar == "mes":
        return {numero: nombre for numero, nombre in enumerate(MESES, start=1)}

    catalogo = AGRUPACIONES[agrupar][1]

    if catalogo is None:
        return {}

    tabla, codigo, descripcion = catalogo
    query = text(f"SELECT {codigo} AS clave, {descripcion} AS etiqueta FROM {tabla}")

    return {row.clave: row.etiqueta for row in db.execute(query)}


def get_serie(db, filtros: FiltrosQuery, agrupar: str) -> dict:
    logger.info("Loading series by %s with filters %s", agrupar, filtros.model_dump(exclude_none=True))

    columna = AGRUPACIONES[agrupar][0]

    condicion_v, params_v = condiciones_victimas(filtros)
    victimas = db.execute(
        text(f"""
            SELECT
                v.{columna} AS clave,
                COUNT(*) FILTER (WHERE v.fall_les = 1) AS fallecidos,
                COUNT(*) FILTER (WHERE v.fall_les = 2) AS lesionados
            FROM fallecido_lesionado v
            WHERE {condicion_v}
            GROUP BY v.{columna}
        """),
        params_v,
    ).mappings().all()

    hechos = {}
    if not filtros.tiene_filtros_victima:
        condicion_h, params_h = condiciones_hechos(filtros)
        hechos = {
            row.clave: int(row.hechos)
            for row in db.execute(
                text(f"""
                    SELECT h.{columna} AS clave, COUNT(*) AS hechos
                    FROM hecho h
                    WHERE {condicion_h}
                    GROUP BY h.{columna}
                """),
                params_h,
            )
        }

    por_clave = {row["clave"]: row for row in victimas}
    etiquetas = _etiquetas(db, agrupar)

    datos = []
    for clave in sorted(set(por_clave) | set(hechos)):
        fila = por_clave.get(clave, {"fallecidos": 0, "lesionados": 0})
        datos.append({
            "clave": clave,
            "etiqueta": etiquetas.get(clave, str(clave)),
            **fila_estadistica(
                int(fila["fallecidos"]),
                int(fila["lesionados"]),
                None if filtros.tiene_filtros_victima else hechos.get(clave, 0),
            ),
        })

    return {"agrupar": agrupar, "datos": datos, "nota": nota_hechos(filtros)}


# -- Ranking territorial -----------------------------------------------

# nivel -> columnas y catálogo. hecho no tiene depto_ocu: se deriva del
# código DDMM del municipio (mupio_ocu / 100).
NIVELES = {
    "depto": {
        "columna_victima": "depto_ocu",
        "expresion_hecho": "h.mupio_ocu / 100",
        "catalogo": "cat_departamento",
        "codigo": "depto_ocu",
        "depto": "NULL::int",
    },
    "municipio": {
        "columna_victima": "mupio_ocu",
        "expresion_hecho": "h.mupio_ocu",
        "catalogo": "cat_municipio",
        "codigo": "mupio_ocu",
        "depto": "c.depto_ocu",
    },
}

ORDENES = {
    "fallecidos": "fallecidos DESC",
    "victimas": "(fallecidos + lesionados) DESC",
    "letalidad": "fallecidos::numeric / NULLIF(fallecidos + lesionados, 0) DESC NULLS LAST",
}


def contar_hechos_por_codigo(db, filtros: FiltrosQuery, nivel: str, codigos: list[int]) -> dict[int, int]:
    if filtros.tiene_filtros_victima or not codigos:
        return {}

    expresion = NIVELES[nivel]["expresion_hecho"]
    condicion_h, params_h = condiciones_hechos(filtros)

    query = text(f"""
        SELECT {expresion} AS codigo, COUNT(*) AS hechos
        FROM hecho h
        WHERE {condicion_h}
          AND {expresion} = ANY(:codigos)
        GROUP BY {expresion}
    """)

    return {
        row.codigo: int(row.hechos)
        for row in db.execute(query, {**params_h, "codigos": codigos})
    }


def get_ranking(db, filtros: FiltrosQuery, nivel: str, limite: int, orden: str) -> dict:
    logger.info(
        "Loading ranking by %s (%s, top %s) with filters %s",
        nivel, orden, limite, filtros.model_dump(exclude_none=True),
    )

    config = NIVELES[nivel]
    condicion_v, params_v = condiciones_victimas(filtros)

    query = text(f"""
        WITH v AS (
            SELECT
                v.{config["columna_victima"]} AS codigo,
                COUNT(*) FILTER (WHERE v.fall_les = 1) AS fallecidos,
                COUNT(*) FILTER (WHERE v.fall_les = 2) AS lesionados
            FROM fallecido_lesionado v
            WHERE {condicion_v}
            GROUP BY v.{config["columna_victima"]}
        )
        SELECT
            v.codigo,
            c.nombre,
            {config["depto"]} AS depto,
            v.fallecidos,
            v.lesionados
        FROM v
        INNER JOIN {config["catalogo"]} c
            ON c.{config["codigo"]} = v.codigo
        ORDER BY {ORDENES[orden]}, v.codigo
        LIMIT :limite
    """)

    rows = db.execute(query, {**params_v, "limite": limite}).mappings().all()

    hechos = contar_hechos_por_codigo(db, filtros, nivel, [row["codigo"] for row in rows])

    datos = [
        {
            "posicion": posicion,
            "codigo": row["codigo"],
            "nombre": row["nombre"],
            "depto": row["depto"],
            **fila_estadistica(
                int(row["fallecidos"]),
                int(row["lesionados"]),
                None if filtros.tiene_filtros_victima else hechos.get(row["codigo"], 0),
            ),
        }
        for posicion, row in enumerate(rows, start=1)
    ]

    return {
        "nivel": nivel,
        "orden": orden,
        "limite": limite,
        "datos": datos,
        "nota": nota_hechos(filtros),
    }
