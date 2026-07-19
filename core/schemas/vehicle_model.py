from pydantic import BaseModel


class VehicleModelResponse(BaseModel):
    modelo_veh: int
    marca_veh: int
    g_modelo_veh: int
    nombre: str
    anio: int | None