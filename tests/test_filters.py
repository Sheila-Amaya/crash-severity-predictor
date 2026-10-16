import pytest
from pydantic import ValidationError
from sqlalchemy import text

from core.schemas.filters import (
    ANIOS,
    DEPTOS,
    DIAS_SEMANA,
    EDADES_QUINQUENALES,
    G_HORA_5,
    MUNICIPIOS,
    SEXOS,
    TIPOS_EVENTO,
    TIPOS_VEHICULO,
    FiltrosQuery,
)
from core.services.sql_filters import condiciones_hechos, condiciones_victimas


# -- FiltrosQuery ------------------------------------------------------

def test_filtros_vacios():
    filtros = FiltrosQuery()

    assert filtros.tiene_filtros_victima is False


def test_filtros_validos():
    filtros = FiltrosQuery(
        anio=2023, depto=1, municipio=101, g_hora_5=4, dia_sem_ocu=7,
        tipo_eve=99, tipo_veh=18, sexo=9, edad_quinquenales=18,
    )

    assert filtros.municipio == 101
    assert filtros.tiene_filtros_victima is True


@pytest.mark.parametrize(
    "campo, valor",
    [
        ("anio", 2017),
        ("anio", 2025),
        ("depto", 23),
        ("municipio", 118),
        ("g_hora_5", 5),
        ("dia_sem_ocu", 0),
        ("tipo_eve", 9),
        ("tipo_veh", 17),
        ("sexo", 3),
        ("edad_quinquenales", 19),
    ],
)
def test_filtros_codigo_inexistente(campo, valor):
    with pytest.raises(ValidationError, match=f"{campo}={valor} no existe"):
        FiltrosQuery(**{campo: valor})


def test_municipio_fuera_del_depto():
    with pytest.raises(ValidationError, match="no pertenece al departamento"):
        FiltrosQuery(depto=2, municipio=101)


@pytest.mark.parametrize("campo", ["tipo_veh", "sexo", "edad_quinquenales"])
def test_detecta_filtros_victima(campo):
    valores = {"tipo_veh": 4, "sexo": 1, "edad_quinquenales": 5}

    assert FiltrosQuery(**{campo: valores[campo]}).tiene_filtros_victima is True


# -- Generador de WHERE --------------------------------------------------

def test_sin_filtros_devuelve_true():
    assert condiciones_victimas(FiltrosQuery()) == ("TRUE", {})
    assert condiciones_hechos(FiltrosQuery()) == ("TRUE", {})


def test_condiciones_victimas_parametrizadas():
    sql, params = condiciones_victimas(FiltrosQuery(anio=2023, depto=5, sexo=2))

    assert sql == "v.anio_ocu = :v_anio AND v.depto_ocu = :v_depto AND v.sexo_per = :v_sexo"
    assert params == {"v_anio": 2023, "v_depto": 5, "v_sexo": 2}
    assert "2023" not in sql


def test_condiciones_hechos_ignoran_filtros_victima():
    sql, params = condiciones_hechos(FiltrosQuery(anio=2020, sexo=1, tipo_veh=4))

    assert sql == "h.anio_ocu = :h_anio"
    assert params == {"h_anio": 2020}


def test_condiciones_hechos_depto_por_rango_ddmm():
    sql, params = condiciones_hechos(FiltrosQuery(depto=12))

    assert sql == "h.mupio_ocu BETWEEN :h_depto_desde AND :h_depto_hasta"
    assert params == {"h_depto_desde": 1200, "h_depto_hasta": 1299}


# -- Integración: los códigos coinciden con la base ----------------------

def _distinct(db, sql):
    return frozenset(row[0] for row in db.execute(text(sql)))


@pytest.mark.integration
def test_codigos_coinciden_con_la_base():
    from core.database import SessionLocal

    with SessionLocal() as db:
        db.execute(text("SET TRANSACTION READ ONLY"))

        assert _distinct(db, "SELECT DISTINCT anio_ocu FROM fallecido_lesionado") == ANIOS
        assert _distinct(db, "SELECT DISTINCT anio_ocu FROM hecho") == ANIOS
        assert _distinct(db, "SELECT DISTINCT depto_ocu FROM fallecido_lesionado") == DEPTOS
        assert _distinct(db, "SELECT mupio_ocu FROM cat_municipio") == MUNICIPIOS
        assert _distinct(db, "SELECT DISTINCT g_hora_5 FROM hecho") == G_HORA_5
        assert _distinct(db, "SELECT DISTINCT g_hora_5 FROM fallecido_lesionado") == G_HORA_5
        assert _distinct(db, "SELECT DISTINCT dia_sem_ocu FROM fallecido_lesionado") == DIAS_SEMANA
        assert _distinct(db, "SELECT DISTINCT tipo_eve FROM hecho") == TIPOS_EVENTO
        assert _distinct(db, "SELECT DISTINCT tipo_eve FROM fallecido_lesionado") == TIPOS_EVENTO
        assert _distinct(db, "SELECT DISTINCT tipo_veh FROM fallecido_lesionado") == TIPOS_VEHICULO
        assert _distinct(db, "SELECT DISTINCT sexo_per FROM fallecido_lesionado") == SEXOS
        assert _distinct(db, "SELECT DISTINCT edad_quinquenales FROM fallecido_lesionado") == EDADES_QUINQUENALES

        db.rollback()
