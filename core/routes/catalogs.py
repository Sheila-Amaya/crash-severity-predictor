from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.dependencies import get_db

from core.controllers.catalogs_controller import (
    list_departments,
    list_municipalities,
    list_days,
    list_hour_groups,
    list_hour_groups5
)

from core.schemas.department import DepartmentResponse
from core.schemas.municipality import MunicipalityResponse
from core.schemas.day import DayResponse
from core.schemas.hour_group import HourGroupResponse
from core.schemas.hour_group5 import HourGroup5Response

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