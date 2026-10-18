from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core.controllers.stats_controller import ranking, series, summary
from core.dependencies import get_db
from core.schemas.filters import FiltrosQuery
from core.schemas.statistics import (
    RankingQuery,
    RankingResponse,
    ResumenResponse,
    SerieQuery,
    SerieResponse,
)

router = APIRouter(
    tags=["Statistics"]
)


@router.get(
    "/resumen",
    response_model=ResumenResponse,
    summary="Resumen de hechos y víctimas",
    description=(
        "Devuelve hechos, víctimas, fallecidos, lesionados y letalidad "
        "(fallecidos / (fallecidos + lesionados) * 100). "
        "Con filtros de víctima (tipo_veh, sexo, edad_quinquenales) hechos es null."
    ),
)
def get_summary(
    filtros: Annotated[FiltrosQuery, Query()],
    db: Session = Depends(get_db),
):
    return summary(db, filtros)


@router.get(
    "/estadisticas/serie",
    response_model=SerieResponse,
    summary="Serie por año, mes, día de la semana o jornada",
    description=(
        "Agrupa hechos y víctimas por la dimensión indicada. "
        "jornada = g_hora_5 (Mañana, Tarde, Noche, Ignorada)."
    ),
)
def get_series(
    params: Annotated[SerieQuery, Query()],
    db: Session = Depends(get_db),
):
    return series(db, params.solo_filtros(), params.agrupar)


@router.get(
    "/estadisticas/ranking",
    response_model=RankingResponse,
    summary="Ranking de departamentos o municipios",
    description=(
        "Ordena departamentos o municipios por fallecidos (por defecto), "
        "víctimas o letalidad. Solo incluye lugares con víctimas que cumplan los filtros."
    ),
)
def get_ranking(
    params: Annotated[RankingQuery, Query()],
    db: Session = Depends(get_db),
):
    return ranking(db, params.solo_filtros(), params.nivel, params.limite, params.orden)
