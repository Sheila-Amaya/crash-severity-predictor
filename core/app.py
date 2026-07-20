from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.middleware.exception_handler import register_exception_handlers
from core.middleware.logging_config import setup_logging

from core.routes.predict import router as predict_router
from core.routes.catalogs import router as catalogs_router


# -- Logging ---------------------------------------------------------

setup_logging()


# -- Application Lifespan --------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup / Shutdown events.
    """
    # inicializar recursos compartidos en el futuro.
    # Ejemplo:
    # - Modelo de Machine Learning
    # - Pool de conexiones
    # - Caché

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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -- API Routes ------------------------------------------------------

app.include_router(
    predict_router,
    prefix="/api",
)

app.include_router(
    catalogs_router,
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