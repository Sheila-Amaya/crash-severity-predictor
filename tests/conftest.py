import os
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from dotenv import load_dotenv


# -- Entorno de pruebas ----------------------------------------------
# Se configura ANTES de importar la app, porque core.config lee las
# variables de entorno al importarse.

ROOT_DIR = Path(__file__).resolve().parent.parent

load_dotenv(ROOT_DIR / ".env", override=False)

HAS_REAL_DB = bool(os.getenv("DB_URL"))

if not HAS_REAL_DB:
    # URL ficticia: las pruebas unitarias nunca abren conexión.
    os.environ["DB_URL"] = "postgresql+psycopg2://test:test@localhost:5432/test"

os.environ["CORS_ORIGINS"] = "http://localhost:5173"


from fastapi.testclient import TestClient  # noqa: E402

from core.app import app  # noqa: E402
from core.dependencies import get_db  # noqa: E402


def pytest_collection_modifyitems(config, items):
    if HAS_REAL_DB:
        return

    skip_integration = pytest.mark.skip(
        reason="DB_URL no configurada: se omiten pruebas de integración"
    )

    for item in items:
        if "integration" in item.keywords:
            item.add_marker(skip_integration)


@pytest.fixture
def client():
    """
    Cliente con la sesión de base de datos simulada.
    Las pruebas parchean la capa de servicios.
    """
    app.dependency_overrides[get_db] = lambda: MagicMock()

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def db_client():
    """
    Cliente contra la base real (solo consultas SELECT).
    """
    with TestClient(app) as test_client:
        yield test_client
