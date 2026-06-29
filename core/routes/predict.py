from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import joblib
import pandas as pd
from pathlib import Path

router = APIRouter()

# -- Cargar modelo --------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODEL_PATH = BASE_DIR / "data" / "models" / "random_forest.pkl"

try:
    model = joblib.load(MODEL_PATH)
except FileNotFoundError:
    raise RuntimeError("Modelo no encontrado. Verifique la ruta del archivo.")

# -- Definir el esquema de entrada con validación ----------------
class AccidenteInput(BaseModel):
    tipo_eve: int = Field(..., ge=1, le=10, description="Tipo de evento (1-10)")
    tipo_veh: int = Field(..., ge=1, le=15, description="Tipo de vehículo (1-15)")
    g_hora_5: int = Field(..., ge=1, le=4, description="Jornada horaria (1-4)")
    dia_sem_ocu: int = Field(..., ge=1, le=7, description="Día de la semana (1=Lunes a 7=Domingo)")
    sexo_per: int = Field(..., ge=1, le=2, description="Sexo (1=Hombre, 2=Mujer)")
    edad_quinquenales: int = Field(..., ge=1, le=18, description="Rango quinquenal (1-18)")
    mayor_menor: int = Field(..., ge=1, le=2, description="Mayor/menor de edad (1=Mayor, 2=Menor)")
    depto_ocu: int = Field(..., ge=1, le=22, description="Código de departamento (1-22)")

    class Config:
        json_schema_extra = {
            "example": {
                "tipo_eve": 1,
                "tipo_veh": 4,
                "g_hora_5": 2,
                "dia_sem_ocu": 6,
                "sexo_per": 1,
                "edad_quinquenales": 4,
                "mayor_menor": 1,
                "depto_ocu": 1
            }
        }

# -- Endpoint de predicción ---------------------------------------
@router.post("/predecir")
def predecir(data: AccidenteInput):
    try:
        features = pd.DataFrame([[
            data.tipo_eve,
            data.tipo_veh,
            data.g_hora_5,
            data.dia_sem_ocu,
            data.sexo_per,
            data.edad_quinquenales,
            data.mayor_menor,
            data.depto_ocu
        ]], columns=[
            'tipo_eve', 'tipo_veh', 'g_hora_5', 'dia_sem_ocu',
            'sexo_per', 'edad_quinquenales', 'mayor_menor', 'depto_ocu'
        ])

        prediccion = model.predict(features)[0]
        probabilidad = model.predict_proba(features)[0]

        resultado = "Fallecido" if prediccion == 1 else "Lesionado"
        confianza = round(float(max(probabilidad)) * 100, 2)

        return {
            "resultado": resultado,
            "confianza": confianza,
            "clase": int(prediccion)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error durante la inferencia: {str(e)}")