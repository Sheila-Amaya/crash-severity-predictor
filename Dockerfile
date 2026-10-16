# syntax=docker/dockerfile:1.7
# API FastAPI (Random Forest + SHAP).
#
# - Python 3.14.0, la misma versión del .venv con que se entrenó el modelo
#   (el .pkl solo carga con scikit-learn 1.8.0, fijado en requirements.txt).
# - El modelo NO va en la imagen: se monta en /app/data/models (solo lectura).
#   Si se pasa el contexto "modelos" (docker compose lo hace), el build verifica
#   que el .pkl y SHAP cargan, sin copiar el archivo a ninguna capa.

ARG PYTHON_VERSION=3.14.0

# Contexto "modelos" vacío por defecto (docker compose lo reemplaza por
# ./data/models con additional_contexts)
FROM scratch AS modelos

# -- Dependencias en un venv -----------------------------------------
FROM python:${PYTHON_VERSION}-slim AS dependencias
ENV PIP_DISABLE_PIP_VERSION_CHECK=1 PIP_NO_CACHE_DIR=1
RUN python -m venv /opt/venv
ENV PATH=/opt/venv/bin:$PATH
COPY requirements.txt .
RUN pip install -r requirements.txt

# -- Imagen final ----------------------------------------------------
FROM python:${PYTHON_VERSION}-slim AS api
ENV PATH=/opt/venv/bin:$PATH \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # numba (dependencia de SHAP) necesita una caché escribible
    NUMBA_CACHE_DIR=/tmp/numba

RUN groupadd --system --gid 10001 app \
 && useradd --system --uid 10001 --gid app --home-dir /app --no-create-home app

COPY --from=dependencias /opt/venv /opt/venv
WORKDIR /app
COPY --chown=app:app core/ core/
# Códigos válidos del simulador (los mismos con que se entrenó el modelo)
COPY --chown=app:app data/clean/train.parquet data/clean/train.parquet
RUN mkdir -p data/models && chown app:app data/models

# Verificación opcional en el build: el modelo y SHAP cargan con estas versiones
RUN --mount=type=bind,from=modelos,target=/modelos,ro \
    if [ -f /modelos/random_forest.pkl ]; then \
      python -c "import joblib, shap, sklearn; m = joblib.load('/modelos/random_forest.pkl'); shap.TreeExplainer(m); print('Modelo y SHAP cargan con scikit-learn', sklearn.__version__)"; \
    else \
      echo 'Aviso: sin random_forest.pkl en el contexto modelos; no se verifica la carga.'; \
    fi

USER app
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD ["python", "-c", "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/', timeout=4).status == 200 else 1)"]

# Detrás de nginx (red interna): se confía en sus cabeceras X-Forwarded-*
CMD ["uvicorn", "core.app:app", "--host", "0.0.0.0", "--port", "8000", \
     "--proxy-headers", "--forwarded-allow-ips=*", "--no-server-header"]
