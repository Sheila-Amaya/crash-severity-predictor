from core.services.catalog_service import get_prediction_options
from core.services.predict_service import predict_accident
from core.services.training_codes import load_training_codes
from core.schemas.prediction import AccidenteInput


def predict(data: AccidenteInput):

    return predict_accident(data)


def prediction_options(db):

    return get_prediction_options(db, load_training_codes())
