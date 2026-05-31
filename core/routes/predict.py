from fastapi import APIRouter
from pydantic import BaseModel
import joblib
import numpy as np
import os

router = APIRouter()

# -- Cargar modelo ----------------------------------------------
MODEL_PATH = os.path.join(os.path.dirname(__file__), '../../data/models/random_forest.pkl')
model = joblib.load(MODEL_PATH)

class AccidenteInput(BaseModel):
    tipo_eve: int
    tipo_veh: int
    g_hora_5: int
    dia_sem_ocu: int
    sexo_per: int
    edad_quinquenales: int
    mayor_menor: int
    depto_ocu: int

@router.post("/predecir")
def predecir(data: AccidenteInput):
    features = np.array([[
        data.tipo_eve,
        data.tipo_veh,
        data.g_hora_5,
        data.dia_sem_ocu,
        data.sexo_per,
        data.edad_quinquenales,
        data.mayor_menor,
        data.depto_ocu
    ]])

    prediccion = model.predict(features)[0]
    probabilidad = model.predict_proba(features)[0]

    resultado = "Fallecido" if prediccion == 1 else "Lesionado"
    confianza = round(float(max(probabilidad)) * 100, 2)

    return {
        "resultado": resultado,
        "confianza": confianza,
        "clase": int(prediccion)
    }