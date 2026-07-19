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