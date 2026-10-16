"""
Pruebas de /api/predecir con el modelo real (sin base de datos).
Se omiten si data/models/random_forest.pkl no existe (no está en git).
"""

import pytest

from core.services.predict_service import MODEL_PATH, load_model
from core.services.training_codes import FEATURES, TRAIN_PATH, load_training_codes

pytestmark = pytest.mark.skipif(
    not MODEL_PATH.exists(),
    reason="random_forest.pkl no disponible",
)

CASO = {
    "tipo_eve": 2,
    "tipo_veh": 4,
    "g_hora_5": 3,
    "dia_sem_ocu": 6,
    "sexo_per": 1,
    "edad_quinquenales": 7,
    "mayor_menor": 1,
    "depto_ocu": 1,
}


def test_predecir_ok(client):
    response = client.post("/api/predecir", json=CASO)

    assert response.status_code == 200

    data = response.json()

    assert data["resultado"] in {"Fallecido", "Lesionado"}
    assert data["clase"] in {1, 2}
    assert data["probabilidades"]["Fallecido"] + data["probabilidades"]["Lesionado"] == pytest.approx(100, abs=0.02)
    assert len(data["factores"]) == 3

    contribuciones = [abs(f["contribucion"]) for f in data["factores"]]
    assert contribuciones == sorted(contribuciones, reverse=True)
    assert {f["variable"] for f in data["factores"]} <= set(FEATURES)


def test_predecir_bicicleta(client):
    response = client.post("/api/predecir", json={**CASO, "tipo_veh": 18})

    assert response.status_code == 200


@pytest.mark.parametrize(
    "campo, valor",
    [
        ("tipo_eve", 99),
        ("tipo_veh", 99),
        ("g_hora_5", 4),
        ("sexo_per", 9),
        ("mayor_menor", 9),
    ],
)
def test_predecir_rechaza_codigos_ignorados(client, campo, valor):
    response = client.post("/api/predecir", json={**CASO, campo: valor})

    assert response.status_code == 422
    assert "código 'Ignorado'" in response.json()["errors"][0]["msg"]


@pytest.mark.parametrize(
    "campo, valor",
    [
        ("tipo_veh", 15),
        ("tipo_veh", 17),
        ("depto_ocu", 23),
        ("edad_quinquenales", 19),
        ("dia_sem_ocu", 0),
    ],
)
def test_predecir_rechaza_codigos_fuera_de_entrenamiento(client, campo, valor):
    response = client.post("/api/predecir", json={**CASO, campo: valor})

    assert response.status_code == 422
    assert "no aparece en los datos de entrenamiento" in response.json()["errors"][0]["msg"]


def test_predecir_campo_faltante(client):
    caso = {k: v for k, v in CASO.items() if k != "depto_ocu"}

    response = client.post("/api/predecir", json=caso)

    assert response.status_code == 422


def test_shap_suma_la_probabilidad():
    """Base + suma de contribuciones SHAP = probabilidad de la clase."""
    import pandas as pd

    model, explainer = load_model()
    features = pd.DataFrame([CASO], columns=list(FEATURES))

    shap_values = explainer.shap_values(features)
    proba = model.predict_proba(features)[0]

    for index in range(len(model.classes_)):
        total = explainer.expected_value[index] + shap_values[0, :, index].sum()
        assert total == pytest.approx(proba[index], abs=1e-6)


def test_features_en_el_orden_del_modelo():
    model, _ = load_model()

    assert tuple(model.feature_names_in_) == FEATURES


@pytest.mark.skipif(not TRAIN_PATH.exists(), reason="train.parquet no disponible")
def test_codigos_de_entrenamiento_desde_parquet():
    codigos = load_training_codes()

    assert set(codigos) == set(FEATURES)
    assert 18 in codigos["tipo_veh"]
    assert 15 not in codigos["tipo_veh"]
    assert 99 not in codigos["tipo_eve"] | codigos["tipo_veh"]
    assert 9 not in codigos["sexo_per"] | codigos["mayor_menor"]
    assert 4 not in codigos["g_hora_5"]
    assert 18 in codigos["edad_quinquenales"]


def test_predecir_sin_modelo_responde_503(client, monkeypatch):
    def sin_modelo(_data):
        raise RuntimeError("Model file not found")

    monkeypatch.setattr("core.routes.predict.predict", sin_modelo)

    response = client.post("/api/predecir", json=CASO)

    assert response.status_code == 503


# -- GET /api/predecir/opciones -------------------------------------------

OPCIONES = {
    "tipo_eve": [{"id": 1, "descripcion": "Colisión"}],
    "tipo_veh": [{"id": 18, "descripcion": "Bicicleta"}],
    "g_hora_5": [{"id": 1, "descripcion": "Mañana"}],
    "dia_sem_ocu": [{"id": 1, "descripcion": "Lunes"}],
    "sexo_per": [{"id": 1, "descripcion": "Hombre"}],
    "edad_quinquenales": [{"id": 18, "descripcion": "Ignorado"}],
    "mayor_menor": [{"id": 1, "descripcion": "Mayor"}],
    "depto_ocu": [{"id": 1, "descripcion": "Guatemala"}],
    "nota": "Algunos códigos no se ofrecen.",
}


def test_opciones_ok(client):
    from unittest.mock import patch

    with patch("core.routes.predict.prediction_options", return_value=OPCIONES):
        response = client.get("/api/predecir/opciones")

    assert response.status_code == 200
    assert response.json() == OPCIONES


def test_opciones_usa_codigos_de_entrenamiento():
    from unittest.mock import MagicMock

    from core.services.catalog_service import get_prediction_options

    db = MagicMock()
    db.execute.return_value = []
    codigos = load_training_codes()

    resultado = get_prediction_options(db, codigos)

    enviados = [call.args[1]["codigos"] for call in db.execute.call_args_list]
    assert enviados == [sorted(codigos[feature]) for feature in FEATURES]
    assert "no los vio en entrenamiento" in resultado["nota"]


def test_opciones_sin_datos_de_entrenamiento_responde_503(client, monkeypatch):
    def sin_datos(_db):
        raise RuntimeError("Training data not found")

    monkeypatch.setattr("core.routes.predict.prediction_options", sin_datos)

    assert client.get("/api/predecir/opciones").status_code == 503


@pytest.mark.integration
def test_opciones_reales_coinciden_con_lo_que_acepta_predecir(db_client):
    response = db_client.get("/api/predecir/opciones")

    assert response.status_code == 200

    data = response.json()
    codigos = load_training_codes()

    for feature in FEATURES:
        ids = {opcion["id"] for opcion in data[feature]}
        assert ids == set(codigos[feature]), feature
        assert all(opcion["descripcion"] for opcion in data[feature])

    assert not {99} & {o["id"] for o in data["tipo_veh"]}
    assert 15 not in {o["id"] for o in data["tipo_veh"]}
    assert 4 not in {o["id"] for o in data["g_hora_5"]}
    assert data["nota"]

    # Cada opción ofrecida es aceptada por /api/predecir
    caso = {feature: data[feature][0]["id"] for feature in FEATURES}
    for opcion in data["tipo_veh"]:
        assert db_client.post("/api/predecir", json={**caso, "tipo_veh": opcion["id"]}).status_code == 200
