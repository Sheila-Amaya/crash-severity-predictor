from sqlalchemy.orm import Session
from core.database import SessionLocal


def get_db():

    db: Session = SessionLocal()

    try:
        yield db

    finally:
        db.close()