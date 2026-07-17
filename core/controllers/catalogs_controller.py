from fastapi import HTTPException

from core.services.catalog_service import get_departments
from core.services.catalog_service import ( get_departments, get_municipalities)


def list_departments(db):
    try:
        return get_departments(db)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener departamentos: {str(e)}"
        )

def list_municipalities(db, depto_ocu: int):
    try:
        return get_municipalities(db, depto_ocu)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener municipios: {str(e)}"
        )