from fastapi import APIRouter

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
    description="Predicts whether a traffic accident will result in a fatality or an injured person."
)
def predecir(data: AccidenteInput):

    result = predict(data)

    return PredictionResponse(**result)