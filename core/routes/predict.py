from pathlib import Path
import joblib
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

# -- Router --------------------------------------------------
router = APIRouter(
    tags=["Prediction"]
)

# -- Cargar modelo --------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODEL_PATH = BASE_DIR / "data" / "models" / "random_forest.pkl"

if not MODEL_PATH.exists():
    raise RuntimeError(f"Model file not found: {MODEL_PATH}")

model = joblib.load(MODEL_PATH)

# -- Request model --------------------------------------------------
class AccidenteInput(BaseModel):
    tipo_eve: int = Field(..., ge=1, le=10)
    tipo_veh: int = Field(..., ge=1, le=15)
    g_hora_5: int = Field(..., ge=1, le=4)
    dia_sem_ocu: int = Field(..., ge=1, le=7)
    sexo_per: int = Field(..., ge=1, le=2)
    edad_quinquenales: int = Field(..., ge=1, le=18)
    mayor_menor: int = Field(..., ge=1, le=2)
    depto_ocu: int = Field(..., ge=1, le=22)

    class Config:
        json_schema_extra = {
            "example": {
                "tipo_eve": 2,
                "tipo_veh": 4,
                "g_hora_5": 3,
                "dia_sem_ocu": 6,
                "sexo_per": 1,
                "edad_quinquenales": 7,
                "mayor_menor": 1,
                "depto_ocu": 1
            }
        }

# -- Response model --------------------------------------------------
class Probabilidades(BaseModel):
    Fallecido: float
    Lesionado: float


class PredictionResponse(BaseModel):
    resultado: str
    clase: int
    confianza: float
    probabilidades: Probabilidades

    class Config:
        json_schema_extra = {
            "example": {
                "resultado": "Fallecido",
                "clase": 1,
                "confianza": 67.24,
                "probabilidades": {
                    "Fallecido": 67.24,
                    "Lesionado": 32.76
                }
            }
        }

# -- Prediction endpoint --------------------------------------------------
@router.post(
    "/predecir",
    response_model=PredictionResponse,
    summary="Predict accident severity",
    description="Predicts whether a traffic accident will result in a fatality or an injured person."
)
def predecir(data: AccidenteInput):

    try:

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

        # Crear diccionario usando las clases reales del modelo
        class_probabilities = {
            int(cls): float(prob)
            for cls, prob in zip(model.classes_, probabilities)
        }

        print("\n============= MODEL DEBUG =============")
        print("Prediction:", prediction)
        print("Classes:", model.classes_)
        print("Probabilities:", probabilities)
        print("Class mapping:", class_probabilities)
        print("=======================================\n")

        # modelo:
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

        return PredictionResponse(
            resultado=result,
            clase=prediction,
            confianza=confidence,
            probabilidades=Probabilidades(
                Fallecido=fatal_probability,
                Lesionado=injured_probability
            )
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction error: {str(e)}"
        )