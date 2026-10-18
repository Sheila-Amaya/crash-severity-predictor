from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator

from core.services.training_codes import FEATURES, get_training_codes


# -- Códigos vistos por el modelo en entrenamiento -------------------
# Fuente única: data/clean/train.parquet (core/services/training_codes.py).
# Los códigos "Ignorado" (99, 9, g_hora_5=4) se imputaron con la moda antes
# de entrenar, por lo que el modelo nunca los vio. edad_quinquenales=18
# ("Ignorado") sí se conservó como categoría.

# Códigos "Ignorado" por variable (solo para dar un mensaje más claro)
CODIGOS_IGNORADOS = {
    "tipo_eve": {99},
    "tipo_veh": {99},
    "g_hora_5": {4},
    "sexo_per": {9},
    "mayor_menor": {9},
}

ETIQUETAS_VARIABLES = {
    "tipo_eve": "Tipo de evento",
    "tipo_veh": "Tipo de vehículo",
    "g_hora_5": "Jornada",
    "dia_sem_ocu": "Día de la semana",
    "sexo_per": "Sexo",
    "edad_quinquenales": "Edad quinquenal",
    "mayor_menor": "Mayor o menor de edad",
    "depto_ocu": "Departamento",
}


# -- Request Model --------------------------------------------------

class AccidenteInput(BaseModel):
    tipo_eve: int
    tipo_veh: int
    g_hora_5: int
    dia_sem_ocu: int
    sexo_per: int
    edad_quinquenales: int
    mayor_menor: int
    depto_ocu: int

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

    @field_validator(*FEATURES)
    @classmethod
    def validar_codigo_entrenamiento(cls, value, info):
        codigos = get_training_codes()

        # Sin datos de entrenamiento la predicción responde 503 en el servicio
        if codigos is None:
            return value

        campo = info.field_name

        if value in codigos[campo]:
            return value

        validos = ", ".join(str(code) for code in sorted(codigos[campo]))

        if value in CODIGOS_IGNORADOS.get(campo, set()):
            raise ValueError(
                f"{campo}={value} es el código 'Ignorado'. El modelo no vio códigos "
                f"ignorados en entrenamiento (se imputaron con la moda), así que no "
                f"puede predecir con este valor. Valores válidos: {validos}"
            )

        raise ValueError(
            f"{campo}={value} no aparece en los datos de entrenamiento del modelo. "
            f"Valores válidos: {validos}"
        )


# -- Response Models ------------------------------------------------

class OpcionModelo(BaseModel):
    id: int
    descripcion: str


class PrediccionOpcionesResponse(BaseModel):
    tipo_eve: list[OpcionModelo]
    tipo_veh: list[OpcionModelo]
    g_hora_5: list[OpcionModelo]
    dia_sem_ocu: list[OpcionModelo]
    sexo_per: list[OpcionModelo]
    edad_quinquenales: list[OpcionModelo]
    mayor_menor: list[OpcionModelo]
    depto_ocu: list[OpcionModelo]
    nota: str


class Probabilidades(BaseModel):
    Fallecido: float
    Lesionado: float


class Factor(BaseModel):
    variable: str
    etiqueta: str
    valor: int
    contribucion: float
    efecto: Literal["aumenta", "disminuye"]


class PredictionResponse(BaseModel):
    resultado: str
    clase: int
    confianza: float
    probabilidades: Probabilidades
    factores: list[Factor]

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "resultado": "Fallecido",
                "clase": 1,
                "confianza": 67.24,
                "probabilidades": {
                    "Fallecido": 67.24,
                    "Lesionado": 32.76
                },
                "factores": [
                    {
                        "variable": "tipo_eve",
                        "etiqueta": "Tipo de evento",
                        "valor": 2,
                        "contribucion": 9.85,
                        "efecto": "aumenta"
                    }
                ]
            }
        }
    )
