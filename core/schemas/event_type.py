from pydantic import BaseModel


class EventTypeResponse(BaseModel):
    tipo_eve: int
    descripcion: str