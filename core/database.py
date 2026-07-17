from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from core.config import settings

# Engine de conexión a PostgreSQL
engine = create_engine(
    settings.DB_URL,
    pool_pre_ping=True,
    pool_recycle=300,
)

# Sesiones
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False
)