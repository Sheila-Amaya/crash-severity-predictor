from unittest.mock import MagicMock, patch

import pytest

from core.schemas.filters import FiltrosQuery
from core.services import stats_service


FILA = {"hechos": 5, "victimas": 4, "fallecidos": 1, "lesionados": 3, "letalidad": 25.0}

SERIE = {
    "agrupar": "anio",
    "datos": [{"clave": 2018, "etiqueta": "2018", **FILA}],
    "nota": None,
}

RANKING = {
    "nivel": "depto",
    "orden": "fallecidos",
    "limite": 10,
    "datos": [{"posicion": 1, "codigo": 1, "nombre": "Guatemala", "depto": None, **FILA}],
    "nota": None,
}


# -- /api/estadisticas/serie ---------------------------------------------

@pytest.mark.parametrize("agrupar", ["anio", "mes", "dia_sem", "jornada"])
def test_serie_ok(client, agrupar):
    with patch("core.controllers.stats_controller.get_serie", return_value=SERIE) as mock:
        response = client.get("/api/estadisticas/serie", params={"agrupar": agrupar})

    assert response.status_code == 200
    assert response.json() == SERIE
    assert mock.call_args.args[1:] == (FiltrosQuery(), agrupar)


def test_serie_filtros_validos(client):
    with patch("core.controllers.stats_controller.get_serie", return_value=SERIE) as mock:
        response = client.get(
            "/api/estadisticas/serie",
            params={"agrupar": "mes", "anio": 2024, "g_hora_5": 3, "sexo": 1},
        )

    assert response.status_code == 200
    assert mock.call_args.args[1] == FiltrosQuery(anio=2024, g_hora_5=3, sexo=1)


@pytest.mark.parametrize(
    "params",
    [
        {},
        {"agrupar": "semana"},
        {"agrupar": "anio", "anio": 2010},
        {"agrupar": "anio", "edad_quinquenales": 0},
    ],
)
def test_serie_parametros_invalidos(client, params):
    with patch("core.controllers.stats_controller.get_serie") as mock:
        response = client.get("/api/estadisticas/serie", params=params)

    assert response.status_code == 422
    mock.assert_not_called()


# -- /api/estadisticas/ranking -------------------------------------------

def test_ranking_ok_por_defecto(client):
    with patch("core.controllers.stats_controller.get_ranking", return_value=RANKING) as mock:
        response = client.get("/api/estadisticas/ranking")

    assert response.status_code == 200
    assert response.json() == RANKING
    assert mock.call_args.args[1:] == (FiltrosQuery(), "depto", 10, "fallecidos")


def test_ranking_filtros_validos(client):
    with patch("core.controllers.stats_controller.get_ranking", return_value=RANKING) as mock:
        response = client.get(
            "/api/estadisticas/ranking",
            params={"nivel": "municipio", "limite": 5, "orden": "letalidad", "depto": 5, "tipo_eve": 99},
        )

    assert response.status_code == 200
    assert mock.call_args.args[1:] == (FiltrosQuery(depto=5, tipo_eve=99), "municipio", 5, "letalidad")


@pytest.mark.parametrize(
    "params",
    [
        {"nivel": "pais"},
        {"limite": 0},
        {"limite": 341},
        {"orden": "hechos"},
        {"municipio": 9999},
    ],
)
def test_ranking_parametros_invalidos(client, params):
    with patch("core.controllers.stats_controller.get_ranking") as mock:
        response = client.get("/api/estadisticas/ranking", params=params)

    assert response.status_code == 422
    mock.assert_not_called()


# -- Lógica del servicio ---------------------------------------------------

def test_ranking_con_filtros_victima_no_consulta_hechos():
    db = MagicMock()

    assert stats_service.contar_hechos_por_codigo(db, FiltrosQuery(sexo=1), "depto", [1, 2]) == {}
    db.execute.assert_not_called()


# -- Integración (base real, solo SELECT) ----------------------------------

@pytest.mark.integration
@pytest.mark.parametrize("agrupar", ["anio", "mes", "dia_sem", "jornada"])
def test_serie_suma_totales_reales(db_client, agrupar):
    response = db_client.get("/api/estadisticas/serie", params={"agrupar": agrupar})

    assert response.status_code == 200

    datos = response.json()["datos"]

    assert sum(d["fallecidos"] for d in datos) == 13_741
    assert sum(d["lesionados"] for d in datos) == 58_201
    assert sum(d["hechos"] for d in datos) == 52_488
    assert all(d["etiqueta"] for d in datos)


@pytest.mark.integration
def test_serie_por_anio_real(db_client):
    response = db_client.get("/api/estadisticas/serie", params={"agrupar": "anio"})

    victimas = {d["clave"]: d["victimas"] for d in response.json()["datos"]}

    assert victimas == {
        2018: 9_407, 2019: 10_660, 2020: 8_142, 2021: 10_544,
        2022: 10_721, 2023: 11_196, 2024: 11_272,
    }


@pytest.mark.integration
def test_ranking_departamentos_real(db_client):
    response = db_client.get("/api/estadisticas/ranking", params={"nivel": "depto", "limite": 22})

    assert response.status_code == 200

    datos = response.json()["datos"]

    assert len(datos) == 22
    assert sum(d["fallecidos"] for d in datos) == 13_741
    assert sum(d["hechos"] for d in datos) == 52_488
    assert [d["fallecidos"] for d in datos] == sorted((d["fallecidos"] for d in datos), reverse=True)


@pytest.mark.integration
def test_ranking_municipios_con_filtro_victima_real(db_client):
    response = db_client.get(
        "/api/estadisticas/ranking",
        params={"nivel": "municipio", "limite": 5, "depto": 1, "sexo": 2},
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data["datos"]) == 5
    assert all(d["depto"] == 1 and d["hechos"] is None for d in data["datos"])
    assert data["nota"]
