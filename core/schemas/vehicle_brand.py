from pydantic import BaseModel


class VehicleBrandResponse(BaseModel):
    marca_veh: int
    nombre: str