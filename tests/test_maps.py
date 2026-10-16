from unittest.mock import patch

import pytest

from core.schemas.filters import FiltrosQuery


FEATURE_COLLECTION = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "geometry": {"type": "MultiPolygon", "coordinates": []},
            "properties": {
                "cod_dep": 1,
                "nombre": "Guatemala",
                "accidentes": 10,
                "fallecidos": 2,
                "lesionados": 8,
            },
        }
    ],
}


@pytest.mark.parametrize(
    "path, method",
    [
        ("/api/maps/departments", "get_departments"),
        ("/api/maps/municipalities", "get_municipalities"),
    ],
)
def test_maps_ok(client, path, method):
    with patch(
        f"core.controllers.maps_controller.MapsService.{method}",
        return_value=FEATURE_COLLECTION,
    ):
        response = client.get(path)

    assert response.status_code == 200
    assert response.json()["features"][0]["properties"]["fallecidos"] == 2


# -- Integración (base real, solo SELECT) -----------------------------

@pytest.mark.integration
@pytest.mark.parametrize(
    "path",
    ["/api/maps/departments", "/api/maps/municipalities"],
)
def test_maps_totals_match_victims_table(db_client, path):
    response = db_client.get(path)

    assert response.status_code == 200

    properties = [f["properties"] for f in response.json()["features"]]

    assert sum(p["fallecidos"] for p in properties) == 13_741
    assert sum(p["lesionados"] for p in properties) == 58_201
    assert sum(p["accidentes"] for p in properties) == 52_488


# -- /api/mapa/coropletico ----------------------------------------------

COROPLETICO = {
    "type": "FeatureCollection",
    "nivel": "depto",
    "nota": None,
    "features": [
        {
            "type": "Feature",
            "geometry": {"type": "MultiPolygon", "coordinates": []},
            "properties": {
                "codigo": 1,
                "nombre": "Guatemala",
                "depto": None,
                "hechos": 10,
                "total": 4,
                "fallecidos": 1,
                "lesionados": 3,
                "letalidad": 25.0,
            },
        }
    ],
}


def test_coropletico_ok(client):
    with patch(
        "core.controllers.maps_controller.MapsService.get_choropleth",
        return_value=COROPLETICO,
    ) as mock:
        response = client.get("/api/mapa/coropletico")

    assert response.status_code == 200
    assert response.json()["features"][0]["properties"]["letalidad"] == 25.0
    assert mock.call_args.args[1:] == (FiltrosQuery(), "depto")


def test_coropletico_filtros_validos(client):
    with patch(
        "core.controllers.maps_controller.MapsService.get_choropleth",
        return_value=COROPLETICO,
    ) as mock:
        response = client.get(
            "/api/mapa/coropletico",
            params={"nivel": "municipio", "depto": 1, "anio": 2022, "edad_quinquenales": 18},
        )

    assert response.status_code == 200
    assert mock.call_args.args[1:] == (
        FiltrosQuery(depto=1, anio=2022, edad_quinquenales=18),
        "municipio",
    )


@pytest.mark.parametrize(
    "params",
    [
        {"nivel": "region"},
        {"depto": 23},
        {"dia_sem_ocu": 8},
        {"depto": 1, "municipio": 201},
    ],
)
def test_coropletico_parametros_invalidos(client, params):
    with patch("core.controllers.maps_controller.MapsService.get_choropleth") as mock:
        response = client.get("/api/mapa/coropletico", params=params)

    assert response.status_code == 422
    mock.assert_not_called()


@pytest.mark.integration
@pytest.mark.parametrize(
    "nivel, features, max_kb",
    [("depto", 22, 150), ("municipio", 340, 500)],
)
def test_coropletico_real(db_client, nivel, features, max_kb):
    response = db_client.get("/api/mapa/coropletico", params={"nivel": nivel})

    assert response.status_code == 200
    assert len(response.content) / 1024 < max_kb

    properties = [f["properties"] for f in response.json()["features"]]

    assert len(properties) == features
    assert sum(p["fallecidos"] for p in properties) == 13_741
    assert sum(p["total"] for p in properties) == 71_942
    assert sum(p["hechos"] for p in properties) == 52_488


@pytest.mark.integration
def test_coropletico_filtro_territorial_y_victima_real(db_client):
    response = db_client.get(
        "/api/mapa/coropletico",
        params={"nivel": "municipio", "depto": 1, "sexo": 2},
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data["features"]) == 17
    assert all(f["properties"]["depto"] == 1 for f in data["features"])
    assert all(f["properties"]["hechos"] is None for f in data["features"])
    assert data["nota"]
