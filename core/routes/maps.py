from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core.dependencies import get_db
from core.controllers.maps_controller import MapsController
from core.schemas.geojson import CoropleticoQuery, FeatureCollection

choropleth_router = APIRouter(
    prefix="/mapa",
    tags=["Maps"]
)


@choropleth_router.get(
    "/coropletico",
    response_model=FeatureCollection,
    summary="Mapa coroplético filtrable",
    description=(
        "GeoJSON simplificado (ST_SimplifyPreserveTopology, tolerancia 0.002°) "
        "por departamento o municipio, con propiedades hechos, total (víctimas), "
        "fallecidos, lesionados y letalidad. Respeta todos los filtros; depto y "
        "municipio además limitan las geometrías devueltas."
    ),
)
def get_choropleth(
    params: Annotated[CoropleticoQuery, Query()],
    db: Session = Depends(get_db),
):
    return MapsController.get_choropleth(db, params.solo_filtros(), params.nivel)
