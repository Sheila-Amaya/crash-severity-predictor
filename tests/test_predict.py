"""
Pruebas de /api/predecir con el modelo real (sin base de datos).
Se omiten si data/models/random_forest.pkl no existe (no está en git).
"""

from pathlib import Path

import pytest

from core.schemas.prediction import CODIGOS_ENTRENAMIENTO, FEATURES
from core.services.predict_service import MODEL_PATH, load_model


ROOT_DIR = Path(__file__).resolve().parent.parent
TRAIN_PATH = ROOT_DIR / "data" / "clean" / "train.parquet"

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
def test_codigos_coinciden_con_entrenamiento():
    import pandas as pd

    train = pd.read_parquet(TRAIN_PATH)

    for campo, codigos in CODIGOS_ENTRENAMIENTO.items():
        assert set(train[campo].unique()) == set(codigos), campo


def test_predecir_sin_modelo_responde_503(client, monkeypatch):
    def sin_modelo(_data):
        raise RuntimeError("Model file not found")

    monkeypatch.setattr("core.routes.predict.predict", sin_modelo)

    response = client.post("/api/predecir", json=CASO)

    assert response.status_code == 503
