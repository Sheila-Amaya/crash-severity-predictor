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