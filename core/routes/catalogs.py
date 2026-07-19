from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.dependencies import get_db

from core.controllers.catalogs_controller import (
    list_departments,
    list_municipalities,
    list_days,
    list_hour_groups,
    list_hour_groups5,
    list_event_types,
    list_vehicle_types,
    list_vehicle_brands,
    list_vehicle_model_groups,
    list_vehicle_models,
    list_vehicle_colors
)

from core.schemas.department import DepartmentResponse
from core.schemas.municipality import MunicipalityResponse
from core.schemas.day import DayResponse
from core.schemas.hour_group import HourGroupResponse
from core.schemas.hour_group5 import HourGroup5Response
from core.schemas.event_type import EventTypeResponse
from core.schemas.vehicle_type import VehicleTypeResponse
from core.schemas.vehicle_brand import VehicleBrandResponse
from core.schemas.vehicle_model_group import VehicleModelGroupResponse
from core.schemas.vehicle_model import VehicleModelResponse
from core.schemas.vehicle_color import VehicleColorResponse

router = APIRouter(
    prefix="/catalogs",
    tags=["Catalogs"]
)


@router.get(
    "/departamentos",
    response_model=List[DepartmentResponse],
    summary="Obtener departamentos",
    description="Devuelve el catálogo de departamentos registrados en la base de datos."
)
def get_departments(db: Session = Depends(get_db)):
    return list_departments(db)


@router.get(
    "/municipios/{depto_ocu}",
    response_model=List[MunicipalityResponse],
    summary="Obtener municipios por departamento",
    description="Devuelve los municipios correspondientes al departamento indicado."
)
def get_municipalities(
    depto_ocu: int,
    db: Session = Depends(get_db)
):
    return list_municipalities(db, depto_ocu)

@router.get(
    "/dias-semana",
    response_model=List[DayResponse],
    summary="Obtener días de la semana",
    description="Devuelve el catálogo de días de la semana."
)
def get_days(
    db: Session = Depends(get_db)
):
    return list_days(db)

@router.get(
    "/grupos-hora",
    response_model=List[HourGroupResponse],
    summary="Obtener grupos de hora",
    description="Devuelve el catálogo de grupos de hora."
)
def get_hour_groups(
    db: Session = Depends(get_db)
):
    return list_hour_groups(db)

@router.get(
    "/grupos-hora-5",
    response_model=List[HourGroup5Response],
    summary="Obtener grupos de hora de 5 intervalos",
    description="Devuelve el catálogo de grupos de hora de cinco intervalos."
)
def get_hour_groups5(
    db: Session = Depends(get_db)
):
    return list_hour_groups5(db)

@router.get(
    "/tipos-evento",
    response_model=List[EventTypeResponse],
    summary="Obtener tipos de evento",
    description="Devuelve el catálogo de tipos de evento."
)
def get_event_types(
    db: Session = Depends(get_db)
):
    return list_event_types(db)

@router.get(
    "/tipos-vehiculo",
    response_model=List[VehicleTypeResponse],
    summary="Obtener tipos de vehículo",
    description="Devuelve el catálogo de tipos de vehículo."
)
def get_vehicle_types(
    db: Session = Depends(get_db)
):
    return list_vehicle_types(db)

@router.get(
    "/marcas-vehiculo",
    response_model=List[VehicleBrandResponse],
    summary="Obtener marcas de vehículo",
    description="Devuelve el catálogo de marcas de vehículo."
)
def get_vehicle_brands(
    db: Session = Depends(get_db)
):
    return list_vehicle_brands(db)

@router.get(
    "/grupos-modelo",
    response_model=List[VehicleModelGroupResponse],
    summary="Obtener grupos de modelo",
    description="Devuelve el catálogo de grupos de modelo de vehículos."
)
def get_vehicle_model_groups(
    db: Session = Depends(get_db)
):
    return list_vehicle_model_groups(db)

@router.get(
    "/modelos-vehiculo/{marca_veh}",
    response_model=List[VehicleModelResponse],
    summary="Obtener modelos de vehículo por marca",
    description="Devuelve los modelos correspondientes a la marca indicada."
)
def get_vehicle_models(
    marca_veh: int,
    db: Session = Depends(get_db)
):
    return list_vehicle_models(db, marca_veh)

@router.get(
    "/colores-vehiculo",
    response_model=List[VehicleColorResponse],
    summary="Obtener colores de vehículo",
    description="Devuelve el catálogo de colores de vehículo."
)
def get_vehicle_colors(
    db: Session = Depends(get_db)
):
    return list_vehicle_colors(db)