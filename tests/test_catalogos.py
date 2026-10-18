from unittest.mock import patch

import pytest

from core.schemas.filters import CODIGOS_VALIDOS


OPCIONES = {
    "anio": [{"id": 2018, "descripcion": "2018"}],
    "depto": [{"id": 1, "descripcion": "Guatemala"}],
    "municipio": [{"id": 101, "descripcion": "Guatemala", "depto": 1}],
    "g_hora_5": [{"id": 4, "descripcion": "Ignorada"}],
    "dia_sem_ocu": [{"id": 1, "descripcion": "Lunes"}],
    "tipo_eve": [{"id": 99, "descripcion": "Ignorado"}],
    "tipo_veh": [{"id": 18, "descripcion": "Bicicleta"}],
    "sexo": [{"id": 9, "descripcion": "Ignorado"}],
    "edad_quinquenales": [{"id": 18, "descripcion": "Ignorado"}],
}


def test_catalogos_ok(client):
    with patch(
        "core.routes.catalogs.list_filter_options",
        return_value=OPCIONES,
    ):
        response = client.get("/api/catalogos")

    assert response.status_code == 200
    assert set(response.json()) == set(OPCIONES)
    assert response.json()["tipo_eve"][0] == {"id": 99, "descripcion": "Ignorado"}


def test_catalogos_ignora_parametros_desconocidos(client):
    # /api/catalogos no recibe filtros: un parámetro extra no cambia la respuesta
    with patch(
        "core.routes.catalogs.list_filter_options",
        return_value=OPCIONES,
    ):
        response = client.get("/api/catalogos", params={"anio": 1999})

    assert response.status_code == 200


# -- Integración (base real, solo SELECT) -----------------------------

@pytest.mark.integration
def test_catalogos_contra_la_base(db_client):
    response = db_client.get("/api/catalogos")

    assert response.status_code == 200

    data = response.json()

    for menu, codigos in CODIGOS_VALIDOS.items():
        assert {opcion["id"] for opcion in data[menu]} == set(codigos), menu

    descripcion = {menu: {o["id"]: o["descripcion"] for o in data[menu]} for menu in data}

    assert descripcion["tipo_eve"][99] == "Ignorado"
    assert descripcion["tipo_veh"][99] == "Ignorado"
    assert descripcion["tipo_veh"][18] == "Bicicleta"
    assert descripcion["sexo"][9] == "Ignorado"
