from pydantic import BaseModel


class VehicleColorResponse(BaseModel):
    color_veh: int
    nombre: str