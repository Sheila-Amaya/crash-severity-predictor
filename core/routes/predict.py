from fastapi import APIRouter, HTTPException

from core.controllers.predict_controller import predict
from core.schemas.prediction import (
    AccidenteInput,
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
        "Only accepts the codes the model saw in training; 'Ignorado' codes "
        "(99, 9, g_hora_5=4) are rejected with 422."
    )
)
def predecir(data: AccidenteInput):

    try:
        result = predict(data)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="Prediction model not available") from exc

    return PredictionResponse(**result)
