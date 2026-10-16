import logging
from pathlib import Path

import joblib
import pandas as pd
import shap

from core.schemas.prediction import ETIQUETAS_VARIABLES, FEATURES


logger = logging.getLogger(__name__)


# -- Machine Learning Model -----------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODEL_PATH = BASE_DIR / "data" / "models" / "random_forest.pkl"

TOP_FACTORES = 3

_model = None
_explainer = None


def load_model():
    """
    Carga el Random Forest y su TreeExplainer una sola vez.
    Se invoca en el lifespan de la aplicación.
    """
    global _model, _explainer

    if _model is not None:
        return _model, _explainer

    if not MODEL_PATH.exists():
        raise RuntimeError(f"Model file not found: {MODEL_PATH}")

    _model = joblib.load(MODEL_PATH)
    _explainer = shap.TreeExplainer(_model)

    logger.info("Random Forest model and SHAP TreeExplainer loaded successfully.")

    return _model, _explainer


# -- SHAP local -----------------------------------------------------

def top_factores(explainer, model, features: pd.DataFrame, prediction: int) -> list[dict]:
    """
    Las 3 variables con mayor contribución SHAP (en puntos porcentuales de
    probabilidad) hacia la clase predicha, para este caso.
    """
    shap_values = explainer.shap_values(features)
    class_index = list(model.classes_).index(prediction)

    contribuciones = shap_values[0, :, class_index]

    ranking = sorted(
        zip(FEATURES, contribuciones),
        key=lambda item: abs(item[1]),
        reverse=True,
    )[:TOP_FACTORES]

    return [
        {
            "variable": variable,
            "etiqueta": ETIQUETAS_VARIABLES[variable],
            "valor": int(features.iloc[0][variable]),
            "contribucion": round(float(contribucion) * 100, 2),
            "efecto": "aumenta" if contribucion >= 0 else "disminuye",
        }
        for variable, contribucion in ranking
    ]


# -- Prediction Service ---------------------------------------------

def predict_accident(data):
    logger.info("Running accident severity prediction.")

    model, explainer = load_model()

    features = pd.DataFrame(
        [[getattr(data, feature) for feature in FEATURES]],
        columns=list(FEATURES),
    )

    prediction = int(model.predict(features)[0])

    probabilities = model.predict_proba(features)[0]

    class_probabilities = {
        int(cls): float(prob)
        for cls, prob in zip(model.classes_, probabilities)
    }

    logger.info("Prediction completed successfully.")
    logger.info("Predicted class: %s", prediction)
    logger.info("Prediction probabilities: %s", class_probabilities)

    # Model classes:
    # 1 = Fallecido
    # 2 = Lesionado

    fatal_probability = round(
        class_probabilities.get(1, 0.0) * 100,
        2
    )

    injured_probability = round(
        class_probabilities.get(2, 0.0) * 100,
        2
    )

    result = (
        "Fallecido"
        if prediction == 1
        else "Lesionado"
    )

    confidence = round(
        class_probabilities.get(prediction, 0.0) * 100,
        2
    )

    return {
        "resultado": result,
        "clase": prediction,
        "confianza": confidence,
        "probabilidades": {
            "Fallecido": fatal_probability,
            "Lesionado": injured_probability
        },
        "factores": top_factores(explainer, model, features, prediction),
    }
