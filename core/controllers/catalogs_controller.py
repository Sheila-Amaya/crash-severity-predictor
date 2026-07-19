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
    get_vehicle_colors,
    get_genders,
    get_age_groups_80,
    get_age_groups_60,
    get_quinquennial_ages,
    get_major_minor,
    get_driver_statuses,
    get_hospitalizations,
    get_fall_les
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

def list_genders(db):
    try:
        return get_genders(db)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener sexos: {str(e)}"
        )

def list_age_groups_80(db):
    try:
        return get_age_groups_80(db)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener grupos de edad 80+: {str(e)}"
        )

def list_age_groups_60(db):
    try:
        return get_age_groups_60(db)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener grupos de edad 60+: {str(e)}"
        )

def list_quinquennial_ages(db):
    try:
        return get_quinquennial_ages(db)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener edades quinquenales: {str(e)}"
        )

def list_major_minor(db):
    try:
        return get_major_minor(db)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener mayor/menor: {str(e)}"
        )

def list_driver_statuses(db):
    try:
        return get_driver_statuses(db)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener estados del conductor: {str(e)}"
        )

def list_hospitalizations(db):
    try:
        return get_hospitalizations(db)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener estado de internamiento: {str(e)}"
        )

def list_fall_les(db):
    try:
        return get_fall_les(db)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener catálogo de fallecido/lesionado: {str(e)}"
        )