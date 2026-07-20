import logging
from pathlib import Path

import joblib
import pandas as pd


logger = logging.getLogger(__name__)


# -- Load Machine Learning Model ------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODEL_PATH = BASE_DIR / "data" / "models" / "random_forest.pkl"

if not MODEL_PATH.exists():
    raise RuntimeError(f"Model file not found: {MODEL_PATH}")

model = joblib.load(MODEL_PATH)

logger.info("Random Forest model loaded successfully.")


# -- Prediction Service ---------------------------------------------

def predict_accident(data):
    logger.info("Running accident severity prediction.")

    features = pd.DataFrame(
        [[
            data.tipo_eve,
            data.tipo_veh,
            data.g_hora_5,
            data.dia_sem_ocu,
            data.sexo_per,
            data.edad_quinquenales,
            data.mayor_menor,
            data.depto_ocu
        ]],
        columns=[
            "tipo_eve",
            "tipo_veh",
            "g_hora_5",
            "dia_sem_ocu",
            "sexo_per",
            "edad_quinquenales",
            "mayor_menor",
            "depto_ocu"
        ]
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
        }
    }