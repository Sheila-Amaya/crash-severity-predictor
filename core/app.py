import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.middleware.exception_handler import register_exception_handlers
from core.middleware.logging_config import setup_logging

from core.routes.predict import router as predict_router
from core.routes.catalogs import router as catalogs_router
from core.routes.catalogs import options_router as catalog_options_router
from core.routes.maps import choropleth_router
from core.routes.stats import router as stats_router
from core.services.predict_service import load_model
from core.services.training_codes import load_training_codes


# -- Logging ---------------------------------------------------------

setup_logging()


# -- Application Lifespan --------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup / Shutdown events.
    """
    # Modelo Random Forest + SHAP TreeExplainer (una sola carga).
    # Si el .pkl no existe, el resto de la API sigue funcionando y
    # /api/predecir responde 503.
    try:
        load_model()
        load_training_codes()
    except RuntimeError as exc:
        logging.getLogger(__name__).error("Prediction disabled: %s", exc)

    yield

    # Liberar recursos si fuera necesario.


# -- FastAPI Application ---------------------------------------------

app = FastAPI(
    title="Crash Severity Predictor API",
    description="""
REST API for predicting traffic accident severity in Guatemala using
a Random Forest machine learning model.

The API also exposes endpoints for querying geospatial and statistical
information stored in PostgreSQL/PostGIS.
""",
    version="1.0.0",
    contact={
        "name": "Sheila Amaya",
        "url": "https://github.com/Sheila-Amaya",
    },
    lifespan=lifespan,
)


# -- Exception Handlers ----------------------------------------------

register_exception_handlers(app)


# -- CORS ------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# -- API Routes ------------------------------------------------------

app.include_router(
    predict_router,
    prefix="/api",
)

app.include_router(
    catalogs_router,
    prefix="/api",
)

app.include_router(
    catalog_options_router,
    prefix="/api",
)

app.include_router(
    choropleth_router,
    prefix="/api",
)

app.include_router(
    stats_router,
    prefix="/api",
)

# -- Health Check ----------------------------------------------------

@app.get(
    "/",
    tags=["Health"],
    summary="API Health Check",
)
async def root():
    return {
        "status": "ok",
        "message": "Crash Severity Predictor API",
        "version": app.version,
    }