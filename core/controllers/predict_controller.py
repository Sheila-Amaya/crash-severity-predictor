from core.services.predict_service import predict_accident
from core.schemas.prediction import AccidenteInput


def predict(data: AccidenteInput):

    return predict_accident(data)