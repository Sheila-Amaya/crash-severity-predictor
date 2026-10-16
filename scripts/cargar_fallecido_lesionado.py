"""
Carga de víctimas (fallecido_lesionado) con los datos propios del evento.

Migración: db/migrations/001_fallecido_lesionado_con_datos_propios.sql

Uso:
    python scripts/cargar_fallecido_lesionado.py              # prueba en seco
    python scripts/cargar_fallecido_lesionado.py --sin-bd     # prueba en seco sin consultar la BD
    python scripts/cargar_fallecido_lesionado.py --ejecutar   # migración real (una transacción)

Prueba en seco: lee y valida el CSV con pandas. Si hay DB_URL, además lee los
catálogos y la tabla vehiculo en una transacción READ ONLY (solo SELECT).

--ejecutar: en UNA transacción crea fallecido_lesionado_nueva, inserta las
filas, verifica conteos y, solo si todo coincide, renombra
fallecido_lesionado -> fallecido_lesionado_old y la nueva -> fallecido_lesionado.
Ante cualquier diferencia hace ROLLBACK. Nunca borra la tabla _old.
"""

import argparse
import logging
import os
import re
import sys
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from psycopg2.extras import execute_values
from sqlalchemy import create_engine, text


ROOT_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT_DIR / "data" / "clean" / "fallecidos_lesionados_clean.csv"
CORRECCIONES_PATH = ROOT_DIR / "data" / "clean" / "correcciones_fallecido_lesionado.csv"
MIGRATION_PATH = ROOT_DIR / "db" / "migrations" / "001_fallecido_lesionado_con_datos_propios.sql"

SECTION_CREATE = "-- @@SECCION_1_CREAR@@"
SECTION_SWAP = "-- @@SECCION_2_INTERCAMBIO@@"

ANIOS_VALIDOS = range(2018, 2025)

# Valores esperados (fuente: fallecidos_lesionados_clean.csv)
ESPERADO_TOTAL = 71_942
ESPERADO_FALL_LES = {1: 13_741, 2: 58_201}

VEHICLE_KEY_COLS = ["tipo_veh", "marca_veh", "modelo_veh", "color_veh"]

INSERT_COLS = [
    "num_corre",
    "anio_ocu",
    "mes_ocu",
    "dia_ocu",
    "hora_ocu",
    "g_hora_5",
    "dia_sem_ocu",
    "mupio_ocu",
    "depto_ocu",
    "tipo_eve",
    "id_vehiculo",
    "tipo_veh",
    "sexo_per",
    "edad_per",
    "edad_quinquenales",
    "mayor_menor",
    "fall_les",
    "int_o_noint",
]

CATALOGOS = {
    "g_hora_5": "SELECT g_hora_5 FROM cat_grupo_hora_5",
    "dia_sem_ocu": "SELECT dia_sem_ocu FROM cat_dia_semana",
    "mupio_ocu": "SELECT mupio_ocu FROM cat_municipio",
    "depto_ocu": "SELECT depto_ocu FROM cat_departamento",
    "tipo_eve": "SELECT tipo_eve FROM cat_tipo_evento",
    "tipo_veh": "SELECT tipo_veh FROM cat_tipo_vehiculo",
    "sexo_per": "SELECT sexo_per FROM cat_sexo",
    "edad_quinquenales": "SELECT edad_quinquenales FROM cat_edad_quinquenal",
    "mayor_menor": "SELECT mayor_menor FROM cat_mayor_menor",
    "fall_les": "SELECT fall_les FROM cat_fall_les",
    "int_o_noint": "SELECT int_o_noint FROM cat_internado",
}

logger = logging.getLogger("cargar_fallecido_lesionado")


# -- Utilidades -------------------------------------------------------

def mask_error(exc: Exception) -> str:
    """Mensaje de error sin hosts, usuarios ni IPs."""
    message = str(getattr(exc, "orig", exc))
    message = re.sub(r'"[^"]*"', '"<oculto>"', message)
    message = re.sub(r"postgres\.\w+", "postgres.<oculto>", message)
    message = re.sub(r"\d+\.\d+\.\d+\.\d+", "<ip>", message)
    return f"{type(exc).__name__}: {message[:500]}"


def leer_migracion() -> tuple[str, str]:
    sql = MIGRATION_PATH.read_text(encoding="utf-8")

    if SECTION_CREATE not in sql or SECTION_SWAP not in sql:
        raise ValueError("La migración no contiene los marcadores de sección esperados.")

    _, resto = sql.split(SECTION_CREATE, 1)
    crear, intercambio = resto.split(SECTION_SWAP, 1)

    return crear, intercambio


# -- Preparación de datos ----------------------------------------------

def preparar_dataframe() -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Lee el CSV, aplica correcciones documentadas y devuelve el DataFrame
    listo para cargar (sin id_vehiculo) junto con las correcciones aplicadas.
    """
    df = pd.read_csv(CSV_PATH)
    df = df.rename(columns={"año_ocu": "anio_ocu", "año_carga": "anio_carga"})

    correcciones = []

    # 1) Año fuera de rango -> año de carga del INE
    anio_invalido = ~df["anio_ocu"].isin(ANIOS_VALIDOS) & df["anio_carga"].isin(ANIOS_VALIDOS)
    for row in df[anio_invalido].itertuples():
        correcciones.append({
            "num_corre": row.num_corre,
            "anio_ocu": row.anio_carga,
            "columna": "anio_ocu",
            "valor_original": row.anio_ocu,
            "valor_nuevo": row.anio_carga,
            "motivo": "año fuera de 2018-2024; se usa año_carga del INE",
        })
    df.loc[anio_invalido, "anio_ocu"] = df.loc[anio_invalido, "anio_carga"]

    # 2) depto_ocu inconsistente con el municipio (código DDMM: depto = mupio // 100)
    depto_por_municipio = df["mupio_ocu"] // 100
    depto_invalido = df["depto_ocu"] != depto_por_municipio
    for row, depto_correcto in zip(df[depto_invalido].itertuples(), depto_por_municipio[depto_invalido]):
        correcciones.append({
            "num_corre": row.num_corre,
            "anio_ocu": row.anio_ocu,
            "columna": "depto_ocu",
            "valor_original": row.depto_ocu,
            "valor_nuevo": depto_correcto,
            "motivo": f"depto_ocu inconsistente con mupio_ocu={row.mupio_ocu} (código DDMM)",
        })
    df.loc[depto_invalido, "depto_ocu"] = depto_por_municipio[depto_invalido]

    columnas = ["num_corre", "anio_ocu", "columna", "valor_original", "valor_nuevo", "motivo"]

    return df, pd.DataFrame(correcciones, columns=columnas)


def validar_dataframe(df: pd.DataFrame) -> list[str]:
    """Devuelve la lista de errores (vacía si todo coincide)."""
    errores = []

    if len(df) != ESPERADO_TOTAL:
        errores.append(f"total {len(df)} != esperado {ESPERADO_TOTAL}")

    conteo_fall_les = df["fall_les"].value_counts().to_dict()
    for clase, esperado in ESPERADO_FALL_LES.items():
        if conteo_fall_les.get(clase, 0) != esperado:
            errores.append(f"fall_les={clase}: {conteo_fall_les.get(clase, 0)} != esperado {esperado}")

    anios_fuera = sorted(set(df["anio_ocu"]) - set(ANIOS_VALIDOS))
    if anios_fuera:
        errores.append(f"años fuera de 2018-2024: {anios_fuera}")

    duplicados = int(df.duplicated(["anio_ocu", "num_corre"]).sum())
    if duplicados:
        errores.append(f"{duplicados} duplicados de (anio_ocu, num_corre)")

    return errores


def asignar_id_vehiculo(df: pd.DataFrame, conn) -> pd.DataFrame:
    vehiculos = pd.read_sql(
        text("SELECT id_vehiculo, tipo_veh, marca_veh, modelo_veh, color_veh FROM vehiculo"),
        conn,
    )

    merged = df.merge(vehiculos, on=VEHICLE_KEY_COLS, how="left", validate="many_to_one")

    sin_vehiculo = int(merged["id_vehiculo"].isna().sum())
    if sin_vehiculo:
        raise ValueError(f"{sin_vehiculo} filas sin id_vehiculo en la tabla vehiculo.")

    merged["id_vehiculo"] = merged["id_vehiculo"].astype(int)

    return merged


def codigos_faltantes(df: pd.DataFrame, conn) -> dict[str, list[int]]:
    faltantes = {}

    for columna, query in CATALOGOS.items():
        referencia = set(pd.read_sql(text(query), conn).iloc[:, 0].astype(int))
        faltan = sorted(set(df[columna].astype(int)) - referencia)
        if faltan:
            faltantes[columna] = faltan

    return faltantes


def reporte(df: pd.DataFrame, correcciones: pd.DataFrame) -> None:
    logger.info("Filas totales: %s", f"{len(df):,}")
    logger.info("Conteo por año: %s", df.groupby("anio_ocu").size().to_dict())
    logger.info("fall_les: %s", df["fall_les"].value_counts().sort_index().to_dict())
    logger.info("Correcciones aplicadas (%s):", len(correcciones))
    for row in correcciones.itertuples(index=False):
        logger.info(
            "  - %s %s -> %s (num_corre=%s, anio_ocu=%s)",
            row.columna, row.valor_original, row.valor_nuevo, row.num_corre, row.anio_ocu,
        )


def guardar_correcciones(correcciones: pd.DataFrame) -> None:
    correcciones.to_csv(CORRECCIONES_PATH, index=False, encoding="utf-8")
    logger.info("Correcciones guardadas en %s", CORRECCIONES_PATH.relative_to(ROOT_DIR))


# -- Conteos dentro de la transacción -------------------------------------

def verificar_tabla(conn, tabla: str) -> list[str]:
    errores = []

    total = conn.execute(text(f"SELECT COUNT(*) FROM {tabla}")).scalar_one()
    if total != ESPERADO_TOTAL:
        errores.append(f"total en BD {total} != esperado {ESPERADO_TOTAL}")

    por_clase = dict(
        conn.execute(text(f"SELECT fall_les, COUNT(*) FROM {tabla} GROUP BY fall_les")).all()
    )
    for clase, esperado in ESPERADO_FALL_LES.items():
        if por_clase.get(clase, 0) != esperado:
            errores.append(f"fall_les={clase} en BD {por_clase.get(clase, 0)} != esperado {esperado}")

    min_anio, max_anio = conn.execute(
        text(f"SELECT MIN(anio_ocu), MAX(anio_ocu) FROM {tabla}")
    ).one()
    if min_anio != 2018 or max_anio != 2024:
        errores.append(f"años en BD {min_anio}-{max_anio} != 2018-2024")

    logger.info("Verificación en BD: total=%s, fall_les=%s, años=%s-%s", total, por_clase, min_anio, max_anio)

    return errores


# -- Main -----------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    modo = parser.add_mutually_exclusive_group()
    modo.add_argument("--ejecutar", action="store_true", help="ejecuta la migración (escribe en la BD)")
    modo.add_argument("--sin-bd", action="store_true", help="prueba en seco sin consultar la BD")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-7s | %(message)s")

    df, correcciones = preparar_dataframe()
    reporte(df, correcciones)
    guardar_correcciones(correcciones)

    errores = validar_dataframe(df)
    if errores:
        for error in errores:
            logger.error("CSV: %s", error)
        return 1

    logger.info("Validación del CSV: OK")

    if args.sin_bd:
        return 0

    load_dotenv(ROOT_DIR / ".env", override=False)
    if not os.getenv("DB_URL"):
        logger.error("DB_URL no configurada.")
        return 1

    engine = create_engine(os.environ["DB_URL"], pool_pre_ping=True)

    # -- Prueba en seco: solo lectura -----------------------------------
    if not args.ejecutar:
        try:
            with engine.connect() as conn:
                conn.execute(text("SET TRANSACTION READ ONLY"))

                faltantes = codigos_faltantes(df, conn)
                if faltantes:
                    for columna, codigos in faltantes.items():
                        logger.error("Códigos sin catálogo en %s: %s", columna, codigos)
                    return 1
                logger.info("Códigos de catálogo: todos existen")

                cargado = asignar_id_vehiculo(df, conn)
                logger.info("id_vehiculo asignado a %s filas", f"{len(cargado):,}")

                conn.rollback()
        except Exception as exc:
            logger.error("Error de BD: %s", mask_error(exc))
            return 1

        logger.info("PRUEBA EN SECO OK. Nada se escribió en la BD.")
        return 0

    # -- Migración real: una sola transacción ---------------------------
    crear_sql, intercambio_sql = leer_migracion()

    try:
        with engine.connect() as conn:
            transaccion = conn.begin()

            try:
                faltantes = codigos_faltantes(df, conn)
                if faltantes:
                    raise ValueError(f"Códigos sin catálogo: {faltantes}")

                cargado = asignar_id_vehiculo(df, conn)

                logger.info("Creando fallecido_lesionado_nueva...")
                conn.exec_driver_sql(crear_sql)

                filas = list(cargado[INSERT_COLS].astype(int).itertuples(index=False, name=None))

                logger.info("Insertando %s filas...", f"{len(filas):,}")
                cursor = conn.connection.cursor()
                execute_values(
                    cursor,
                    f"INSERT INTO fallecido_lesionado_nueva ({', '.join(INSERT_COLS)}) VALUES %s",
                    filas,
                    page_size=2000,
                )
                cursor.close()

                errores = verificar_tabla(conn, "fallecido_lesionado_nueva")
                if errores:
                    raise ValueError("; ".join(errores))

                logger.info("Conteos OK. Intercambiando tablas...")
                conn.exec_driver_sql(intercambio_sql)

                errores = verificar_tabla(conn, "fallecido_lesionado")
                if errores:
                    raise ValueError("tras intercambio: " + "; ".join(errores))

                transaccion.commit()

            except Exception:
                transaccion.rollback()
                logger.error("ROLLBACK: la BD quedó sin cambios.")
                raise

    except Exception as exc:
        logger.error("Migración fallida: %s", mask_error(exc))
        return 1

    logger.info("MIGRACIÓN COMPLETADA. fallecido_lesionado_old se conserva (no se borró).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
