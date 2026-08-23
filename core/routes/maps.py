from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.dependencies import get_db
from core.controllers.maps_controller import MapsController
from core.schemas.geojson import FeatureCollection

router = APIRouter(
    prefix="/maps",
    tags=["Maps"]
)


@router.get(
    "/departments",
    response_model=FeatureCollection,
    summary="Departments GeoJSON",
    description="Returns all departments as a GeoJSON FeatureCollection."
)
def get_departments(
    db: Session = Depends(get_db),
):
    return MapsController.get_departments(db)

@router.get(
    "/municipalities",
    response_model=FeatureCollection,
    summary="Municipalities GeoJSON",
    description="Returns all municipalities as a GeoJSON FeatureCollection."
)
def get_municipalities(
    db: Session = Depends(get_db),
):
    return MapsController.get_municipalities(db)