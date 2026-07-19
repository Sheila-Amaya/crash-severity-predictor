from fastapi import HTTPException

from core.services.catalog_service import ( 
    get_departments, 
    get_municipalities, 
    get_days, 
    get_hour_groups,
    get_hour_groups5
)


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

def list_days(db):
    try:
        return get_days(db)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener días de la semana: {str(e)}"
        )

def list_hour_groups(db):
    try:
        return get_hour_groups(db)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener grupos de hora: {str(e)}"
        )

def list_hour_groups5(db):
    try:
        return get_hour_groups5(db)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener grupos de hora 5: {str(e)}"
        )