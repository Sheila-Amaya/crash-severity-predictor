from unittest.mock import patch

import pytest


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
