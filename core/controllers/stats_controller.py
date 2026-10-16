from core.schemas.filters import FiltrosQuery
from core.services.stats_service import get_resumen


def summary(db, filtros: FiltrosQuery):
    return get_resumen(db, filtros)
