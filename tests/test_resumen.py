from unittest.mock import MagicMock, patch

import pytest

from core.schemas.filters import FiltrosQuery
from core.services import stats_service


RESUMEN = {
    "hechos": 100,
    "victimas": 50,
    "fallecidos": 10,
    "lesionados": 40,
    "letalidad": 20.0,
    "nota": None,
}


def test_resumen_ok(client):
    with patch("core.controllers.stats_controller.get_resumen", return_value=RESUMEN) as mock:
        response = client.get("/api/resumen")

    assert response.status_code == 200
    assert response.json() == RESUMEN
    assert mock.call_args.args[1] == FiltrosQuery()


def test_resumen_filtros_validos(client):
    with patch("core.controllers.stats_controller.get_resumen", return_value=RESUMEN) as mock:
        response = client.get(
            "/api/resumen",
            params={"anio": 2023, "depto": 1, "municipio": 101, "tipo_veh": 18},
        )

    assert response.status_code == 200
    assert mock.call_args.args[1] == FiltrosQuery(anio=2023, depto=1, municipio=101, tipo_veh=18)


@pytest.mark.parametrize(
    "params",
    [
        {"anio": 2030},
        {"depto": 0},
        {"sexo": 5},
        {"tipo_veh": "auto"},
        {"depto": 2, "municipio": 101},
    ],
)
def test_resumen_filtros_invalidos(client, params):
    with patch("core.controllers.stats_controller.get_resumen") as mock:
        response = client.get("/api/resumen", params=params)

    assert response.status_code == 422
    assert response.json()["success"] is False
    assert response.json()["errors"]
    mock.assert_not_called()


def test_resumen_mensaje_de_error_claro(client):
    response = client.get("/api/resumen", params={"tipo_veh": 17})

    assert response.status_code == 422
    assert "tipo_veh=17 no existe en los datos" in response.json()["errors"][0]["msg"]


# -- Lógica del servicio ------------------------------------------------

def test_letalidad():
    assert stats_service.calcular_letalidad(13_741, 58_201) == 19.1
    assert stats_service.calcular_letalidad(0, 0) is None


def test_servicio_sin_filtros_victima_cuenta_hechos():
    with patch.object(stats_service, "contar_victimas", return_value=(10, 30)), \
         patch.object(stats_service, "contar_hechos", return_value=25):
        resumen = stats_service.get_resumen(MagicMock(), FiltrosQuery(anio=2020))

    assert resumen == {
        "hechos": 25,
        "victimas": 40,
        "fallecidos": 10,
        "lesionados": 30,
        "letalidad": 25.0,
        "nota": None,
    }


def test_servicio_con_filtros_victima_hechos_null():
    db = MagicMock()

    assert stats_service.contar_hechos(db, FiltrosQuery(sexo=2)) is None
    db.execute.assert_not_called()

    with patch.object(stats_service, "contar_victimas", return_value=(1, 3)):
        resumen = stats_service.get_resumen(db, FiltrosQuery(sexo=2))

    assert resumen["hechos"] is None
    assert "filtros de víctima" in resumen["nota"]


# -- Integración (base real, solo SELECT) -----------------------------

@pytest.mark.integration
def test_resumen_totales_reales(db_client):
    response = db_client.get("/api/resumen")

    assert response.status_code == 200
    assert response.json() == {
        "hechos": 52_488,
        "victimas": 71_942,
        "fallecidos": 13_741,
        "lesionados": 58_201,
        "letalidad": 19.1,
        "nota": None,
    }


@pytest.mark.integration
def test_resumen_con_filtro_victima_real(db_client):
    response = db_client.get("/api/resumen", params={"anio": 2023, "sexo": 2})

    assert response.status_code == 200

    data = response.json()

    assert data["hechos"] is None
    assert data["nota"]
    assert 0 < data["victimas"] < 11_196
