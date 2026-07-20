from pydantic import BaseModel, ConfigDict, Field


# -- Request Model --------------------------------------------------

class AccidenteInput(BaseModel):
    tipo_eve: int = Field(..., ge=1, le=10)
    tipo_veh: int = Field(..., ge=1, le=15)
    g_hora_5: int = Field(..., ge=1, le=4)
    dia_sem_ocu: int = Field(..., ge=1, le=7)
    sexo_per: int = Field(..., ge=1, le=2)
    edad_quinquenales: int = Field(..., ge=1, le=18)
    mayor_menor: int = Field(..., ge=1, le=2)
    depto_ocu: int = Field(..., ge=1, le=22)

    model_config = ConfigDict(
        json_schema_extra={
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
    )


# -- Response Models ------------------------------------------------

class Probabilidades(BaseModel):
    Fallecido: float
    Lesionado: float


class PredictionResponse(BaseModel):
    resultado: str
    clase: int
    confianza: float
    probabilidades: Probabilidades

    model_config = ConfigDict(
        json_schema_extra={
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
    )