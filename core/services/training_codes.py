"""
Códigos que el modelo vio en entrenamiento, leídos de data/clean/train.parquet.

Es la única fuente para la validación de POST /api/predecir y para las
opciones de GET /api/predecir/opciones, de modo que ambas no pueden
desfasarse. Se cargan una vez (lifespan) y quedan en memoria.
"""

import logging
from pathlib import Path

import pandas as pd


logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
TRAIN_PATH = BASE_DIR / "data" / "clean" / "train.parquet"

# Orden de columnas con el que se entrenó el modelo
FEATURES = (
    "tipo_eve",
    "tipo_veh",
    "g_hora_5",
    "dia_sem_ocu",
    "sexo_per",
    "edad_quinquenales",
    "mayor_menor",
    "depto_ocu",
)

_codigos: dict[str, frozenset[int]] | None = None


def load_training_codes() -> dict[str, frozenset[int]]:
    """Lee los códigos distintos de cada variable en train.parquet (una vez)."""
    global _codigos

    if _codigos is not None:
        return _codigos

    if not TRAIN_PATH.exists():
        raise RuntimeError(f"Training data not found: {TRAIN_PATH}")

    train = pd.read_parquet(TRAIN_PATH, columns=list(FEATURES))

    _codigos = {
        feature: frozenset(int(code) for code in train[feature].unique())
        for feature in FEATURES
    }

    logger.info("Training codes loaded from %s", TRAIN_PATH.name)

    return _codigos


def get_training_codes() -> dict[str, frozenset[int]] | None:
    """Códigos de entrenamiento, o None si no se pudieron cargar."""
    try:
        return load_training_codes()
    except RuntimeError:
        return None
