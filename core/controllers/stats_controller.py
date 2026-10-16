from core.schemas.filters import FiltrosQuery
from core.services.stats_service import get_ranking, get_resumen, get_serie


def summary(db, filtros: FiltrosQuery):
    return get_resumen(db, filtros)


def series(db, filtros: FiltrosQuery, agrupar: str):
    return get_serie(db, filtros, agrupar)


def ranking(db, filtros: FiltrosQuery, nivel: str, limite: int, orden: str):
    return get_ranking(db, filtros, nivel, limite, orden)
