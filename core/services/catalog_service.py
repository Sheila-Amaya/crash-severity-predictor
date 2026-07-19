from sqlalchemy import text


def get_departments(db):

    query = text("""
        SELECT
            depto_ocu,
            nombre
        FROM cat_departamento
        ORDER BY nombre;
    """)

    result = db.execute(query)

    return [
        {
            "depto_ocu": row.depto_ocu,
            "nombre": row.nombre
        }
        for row in result
    ]
    
    
def get_municipalities(db, depto_ocu: int):

    query = text("""
        SELECT
            mupio_ocu,
            depto_ocu,
            nombre
        FROM cat_municipio
        WHERE depto_ocu = :depto_ocu
        ORDER BY nombre;
    """)

    result = db.execute(
        query,
        {"depto_ocu": depto_ocu}
    )

    return [
        {
            "mupio_ocu": row.mupio_ocu,
            "depto_ocu": row.depto_ocu,
            "nombre": row.nombre
        }
        for row in result
    ]

def get_days(db):

    query = text("""
        SELECT
            dia_sem_ocu,
            nombre
        FROM cat_dia_semana
        ORDER BY dia_sem_ocu;
    """)

    result = db.execute(query)

    return [
        {
            "dia_sem_ocu": row.dia_sem_ocu,
            "nombre": row.nombre
        }
        for row in result
    ]

def get_hour_groups(db):

    query = text("""
        SELECT
            g_hora,
            descripcion
        FROM cat_grupo_hora
        ORDER BY g_hora;
    """)

    result = db.execute(query)

    return [
        {
            "g_hora": row.g_hora,
            "descripcion": row.descripcion
        }
        for row in result
    ]
    

def get_hour_groups5(db):

    query = text("""
        SELECT
            g_hora_5,
            g_hora,
            descripcion
        FROM cat_grupo_hora_5
        ORDER BY g_hora_5;
    """)

    result = db.execute(query)

    return [
        {
            "g_hora_5": row.g_hora_5,
            "g_hora": row.g_hora,
            "descripcion": row.descripcion
        }
        for row in result
    ]

def get_event_types(db):

    query = text("""
        SELECT
            tipo_eve,
            descripcion
        FROM cat_tipo_evento
        ORDER BY tipo_eve;
    """)

    result = db.execute(query)

    return [
        {
            "tipo_eve": row.tipo_eve,
            "descripcion": row.descripcion
        }
        for row in result
    ]


def get_vehicle_types(db):

    query = text("""
        SELECT
            tipo_veh,
            descripcion
        FROM cat_tipo_vehiculo
        ORDER BY tipo_veh;
    """)

    result = db.execute(query)

    return [
        {
            "tipo_veh": row.tipo_veh,
            "descripcion": row.descripcion
        }
        for row in result
    ]
    
def get_vehicle_brands(db):

    query = text("""
        SELECT
            marca_veh,
            nombre
        FROM cat_marca_vehiculo
        ORDER BY nombre;
    """)

    result = db.execute(query)

    return [
        {
            "marca_veh": row.marca_veh,
            "nombre": row.nombre
        }
        for row in result
    ]

def get_vehicle_model_groups(db):

    query = text("""
        SELECT
            g_modelo_veh,
            descripcion
        FROM cat_grupo_modelo
        ORDER BY g_modelo_veh;
    """)

    result = db.execute(query)

    return [
        {
            "g_modelo_veh": row.g_modelo_veh,
            "descripcion": row.descripcion
        }
        for row in result
    ]

def get_vehicle_models(db, marca_veh: int):

    query = text("""
        SELECT
            modelo_veh,
            marca_veh,
            g_modelo_veh,
            nombre,
            anio
        FROM cat_modelo_vehiculo
        WHERE marca_veh = :marca_veh
        ORDER BY nombre;
    """)

    result = db.execute(
        query,
        {"marca_veh": marca_veh}
    )

    return [
        {
            "modelo_veh": row.modelo_veh,
            "marca_veh": row.marca_veh,
            "g_modelo_veh": row.g_modelo_veh,
            "nombre": row.nombre,
            "anio": row.anio
        }
        for row in result
    ]

def get_vehicle_colors(db):

    query = text("""
        SELECT
            color_veh,
            nombre
        FROM cat_color_vehiculo
        ORDER BY nombre;
    """)

    result = db.execute(query)

    return [
        {
            "color_veh": row.color_veh,
            "nombre": row.nombre
        }
        for row in result
    ]