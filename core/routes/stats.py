from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core.controllers.stats_controller import summary
from core.dependencies import get_db
from core.schemas.filters import FiltrosQuery
from core.schemas.statistics import ResumenResponse

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
