from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.routes.predict import router as predict_router
from core.routes.catalogs import router as catalogs_router

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
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    predict_router,
    prefix="/api",
)


app.include_router(
    catalogs_router
)

# -- Health Check --------------------------------------------------
@app.get(
    "/",
    tags=["Health"]
)
def root():
    return {
        "status": "ok",
        "message": "Crash Severity Predictor API",
        "version": app.version
    }