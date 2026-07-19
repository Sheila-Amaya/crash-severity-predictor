from pydantic import BaseModel


class DriverStatusResponse(BaseModel):
    estado_con: int
    descripcion: str