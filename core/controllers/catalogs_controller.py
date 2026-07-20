
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
    return get_departments(db)

def list_municipalities(db, depto_ocu: int):
    return get_municipalities(db, depto_ocu)

def list_days(db):
    return get_days(db)

def list_hour_groups(db):
    return get_hour_groups(db)

def list_hour_groups5(db):
    return get_hour_groups5(db)

def list_event_types(db):
    return get_event_types(db)

def list_vehicle_types(db):
    return get_vehicle_types(db)

def list_vehicle_brands(db):
    return get_vehicle_brands(db)

def list_vehicle_model_groups(db):
    return get_vehicle_model_groups(db)

def list_vehicle_models(db, marca_veh: int):
    return get_vehicle_models(db, marca_veh)

def list_vehicle_colors(db):
    return get_vehicle_colors(db)

def list_genders(db):
    return get_genders(db)

def list_age_groups_80(db):
    return get_age_groups_80(db)

def list_age_groups_60(db):
    return get_age_groups_60(db)

def list_quinquennial_ages(db):
    return get_quinquennial_ages(db)

def list_major_minor(db):
    return get_major_minor(db)

def list_driver_statuses(db):
    return get_driver_statuses(db)

def list_hospitalizations(db):
    return get_hospitalizations(db)

def list_fall_les(db):
    return get_fall_les(db)
