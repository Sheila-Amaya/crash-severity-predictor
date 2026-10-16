from sqlalchemy.orm import Session

from core.schemas.filters import FiltrosQuery
from core.services.maps_service import MapsService


class MapsController:

    @staticmethod
    def get_choropleth(db: Session, filtros: FiltrosQuery, nivel: str):
        return MapsService.get_choropleth(db, filtros, nivel)
