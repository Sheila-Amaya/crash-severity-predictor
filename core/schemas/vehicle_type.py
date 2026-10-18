from pydantic import BaseModel


class VehicleTypeResponse(BaseModel):
    tipo_veh: int
    descripcion: str