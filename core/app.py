from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.routes.predict import router

app = FastAPI(
    title="Crash Severity Predictor API",
    description="API REST para predicción de severidad de hechos de tránsito en Guatemala",
    version="1.0.0"
)

# -- CORS ----------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

# -- Health check ----------------------------------------------
@app.get("/")
def root():
    return {"status": "ok", "message": "Crash Severity Predictor API"}