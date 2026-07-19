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
    list_vehicle_colors,
    list_genders,
    list_age_groups_80,
    list_age_groups_60,
    list_quinquennial_ages,
    list_major_minor,
    list_driver_statuses,
    list_hospitalizations,
    list_fall_les
    
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
from core.schemas.gender import GenderResponse
from core.schemas.age_group_80 import AgeGroup80Response
from core.schemas.age_group_60 import AgeGroup60Response
from core.schemas.age_quinquennial import QuinquennialAgeResponse
from core.schemas.major_minor import MajorMinorResponse
from core.schemas.driver_status import DriverStatusResponse
from core.schemas.hospitalization import HospitalizationResponse
from core.schemas.fall_les import FallLesResponse

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

@router.get(
    "/sexo",
    response_model=List[GenderResponse],
    summary="Obtener sexos",
    description="Devuelve el catálogo de sexo."
)
def get_genders(
    db: Session = Depends(get_db)
):
    return list_genders(db)

@router.get(
    "/grupos-edad-80",
    response_model=List[AgeGroup80Response],
    summary="Obtener grupos de edad 80+",
    description="Devuelve el catálogo de grupos de edad de 80 años o más."
)
def get_age_groups_80(
    db: Session = Depends(get_db)
):
    return list_age_groups_80(db)

@router.get(
    "/grupos-edad-60",
    response_model=List[AgeGroup60Response],
    summary="Obtener grupos de edad 60+",
    description="Devuelve el catálogo de grupos de edad de 60 años o más junto con su grupo de 80 años relacionado."
)
def get_age_groups_60(
    db: Session = Depends(get_db)
):
    return list_age_groups_60(db)

@router.get(
    "/edad-quinquenal",
    response_model=List[QuinquennialAgeResponse],
    summary="Obtener edades quinquenales",
    description="Devuelve el catálogo de edades quinquenales junto con sus grupos de 60 y 80 años relacionados."
)
def get_quinquennial_ages(
    db: Session = Depends(get_db)
):
    return list_quinquennial_ages(db)

@router.get(
    "/mayor-menor",
    response_model=List[MajorMinorResponse],
    summary="Obtener clasificación mayor o menor de edad",
    description="Devuelve el catálogo de clasificación de mayoría de edad."
)
def get_major_minor(
    db: Session = Depends(get_db)
):
    return list_major_minor(db)

@router.get(
    "/estado-conductor",
    response_model=List[DriverStatusResponse],
    summary="Obtener estados del conductor",
    description="Devuelve el catálogo de estados del conductor."
)
def get_driver_statuses(
    db: Session = Depends(get_db)
):
    return list_driver_statuses(db)

@router.get(
    "/internado",
    response_model=List[HospitalizationResponse],
    summary="Obtener estado de internamiento",
    description="Devuelve el catálogo de personas internadas y no internadas."
)
def get_hospitalizations(
    db: Session = Depends(get_db)
):
    return list_hospitalizations(db)

@router.get(
    "/fallecido-lesionado",
    response_model=List[FallLesResponse],
    summary="Obtener estado de fallecido o lesionado",
    description="Devuelve el catálogo de fallecido o lesionado."
)
def get_fall_les(
    db: Session = Depends(get_db)
):
    return list_fall_les(db)