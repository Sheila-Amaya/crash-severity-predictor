from pydantic import BaseModel


class MunicipalityResponse(BaseModel):
    mupio_ocu: int
    depto_ocu: int
    nombre: str