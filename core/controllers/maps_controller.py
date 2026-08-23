from sqlalchemy.orm import Session
from core.services.maps_service import MapsService


class MapsController:

    @staticmethod
    def get_departments(db: Session):
        return MapsService.get_departments(db)
    
    @staticmethod
    def get_municipalities(db: Session,):
        return MapsService.get_municipalities(db)