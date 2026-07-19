from fastapi import HTTPException

from core.services.catalog_service import ( 
    get_departments, 
    get_municipalities, 
    get_days, 
    get_hour_groups,
    get_hour_groups5,
    get_event_types,
    get_vehicle_types,
    get_vehicle_brands,
    get_vehicle_model_groups,
    get_vehicle_models,
    get_vehicle_colors
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

def list_event_types(db):
    try:
        return get_event_types(db)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener tipos de evento: {str(e)}"
        )

def list_vehicle_types(db):
    try:
        return get_vehicle_types(db)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener tipos de vehículo: {str(e)}"
        )

def list_vehicle_brands(db):
    try:
        return get_vehicle_brands(db)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener marcas de vehículo: {str(e)}"
        )

def list_vehicle_model_groups(db):
    try:
        return get_vehicle_model_groups(db)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener grupos de modelo: {str(e)}"
        )

def list_vehicle_models(db, marca_veh: int):
    try:
        return get_vehicle_models(db, marca_veh)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener modelos de vehículo: {str(e)}"
        )

def list_vehicle_colors(db):
    try:
        return get_vehicle_colors(db)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener colores de vehículo: {str(e)}"
        )