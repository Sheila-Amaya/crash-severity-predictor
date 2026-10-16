from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.controllers.predict_controller import predict, prediction_options
from core.dependencies import get_db
from core.schemas.prediction import (
    AccidenteInput,
    PrediccionOpcionesResponse,
    PredictionResponse
)


# -- Router ---------------------------------------------------------

router = APIRouter(
    tags=["Prediction"]
)


# -- Prediction Endpoint --------------------------------------------

@router.post(
    "/predecir",
    response_model=PredictionResponse,
    summary="Predict accident severity",
    description=(
        "Predicts whether a traffic accident will result in a fatality or an "
        "injured person, and returns the 3 variables with the largest local "
        "SHAP contribution (percentage points) towards the predicted class. "
        "Only accepts the codes the model saw in training (see "
        "/api/predecir/opciones); 'Ignorado' codes (99, 9, g_hora_5=4) are "
        "rejected with 422."
    )
)
def predecir(data: AccidenteInput):

    try:
        result = predict(data)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="Prediction model not available") from exc

    return PredictionResponse(**result)


@router.get(
    "/predecir/opciones",
    response_model=PrediccionOpcionesResponse,
    summary="Opciones del simulador",
    description=(
        "Opciones (id + descripción) de las 8 variables del modelo, limitadas a "
        "los códigos que el modelo vio en entrenamiento (data/clean/train.parquet), "
        "que son exactamente los que acepta POST /api/predecir."
    ),
)
def get_prediction_options(db: Session = Depends(get_db)):

    try:
        return prediction_options(db)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="Training data not available") from exc
