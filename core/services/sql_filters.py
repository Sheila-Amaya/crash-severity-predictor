"""
Generador de condiciones WHERE parametrizadas a partir de FiltrosQuery.

Los nombres de columna salen de los diccionarios de este módulo (nunca de la
petición) y los valores se envían siempre como parámetros enlazados de
text(); nunca se concatenan en el SQL.
"""

from core.schemas.filters import FiltrosQuery


# campo del filtro -> columna en fallecido_lesionado
COLUMNAS_VICTIMA = {
    "anio": "anio_ocu",
    "depto": "depto_ocu",
    "municipio": "mupio_ocu",
    "g_hora_5": "g_hora_5",
    "dia_sem_ocu": "dia_sem_ocu",
    "tipo_eve": "tipo_eve",
    "tipo_veh": "tipo_veh",
    "sexo": "sexo_per",
    "edad_quinquenales": "edad_quinquenales",
}

# campo del filtro -> columna en hecho (solo filtros de evento).
# depto se resuelve aparte: hecho no tiene depto_ocu, se deriva del código
# DDMM del municipio.
COLUMNAS_HECHO = {
    "anio": "anio_ocu",
    "municipio": "mupio_ocu",
    "g_hora_5": "g_hora_5",
    "dia_sem_ocu": "dia_sem_ocu",
    "tipo_eve": "tipo_eve",
}


def condiciones_victimas(filtros: FiltrosQuery, alias: str = "v") -> tuple[str, dict]:
    """
    Condición para fallecido_lesionado. Aplica filtros de evento y de víctima.
    Devuelve ("TRUE", {}) si no hay filtros.
    """
    clauses = []
    params = {}

    for campo, columna in COLUMNAS_VICTIMA.items():
        valor = getattr(filtros, campo)

        if valor is None:
            continue

        param = f"v_{campo}"
        clauses.append(f"{alias}.{columna} = :{param}")
        params[param] = valor

    return (" AND ".join(clauses) or "TRUE"), params


def condiciones_hechos(filtros: FiltrosQuery, alias: str = "h") -> tuple[str, dict]:
    """
    Condición para hecho. Solo aplica filtros de evento; los de víctima
    no tienen equivalente en hecho.
    """
    clauses = []
    params = {}

    for campo, columna in COLUMNAS_HECHO.items():
        valor = getattr(filtros, campo)

        if valor is None:
            continue

        param = f"h_{campo}"
        clauses.append(f"{alias}.{columna} = :{param}")
        params[param] = valor

    if filtros.depto is not None:
        # Municipios del departamento: DD01..DD99 (usa el índice de mupio_ocu)
        clauses.append(f"{alias}.mupio_ocu BETWEEN :h_depto_desde AND :h_depto_hasta")
        params["h_depto_desde"] = filtros.depto * 100
        params["h_depto_hasta"] = filtros.depto * 100 + 99

    return (" AND ".join(clauses) or "TRUE"), params
