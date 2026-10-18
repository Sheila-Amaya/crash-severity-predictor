from pydantic import BaseModel


class VehicleModelGroupResponse(BaseModel):
    g_modelo_veh: int
    descripcion: str