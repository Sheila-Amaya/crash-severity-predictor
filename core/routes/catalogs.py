from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.dependencies import get_db

from core.controllers.catalogs_controller import (
    list_departments,
    list_municipalities
)

from core.schemas.department import DepartmentResponse
from core.schemas.municipality import MunicipalityResponse

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