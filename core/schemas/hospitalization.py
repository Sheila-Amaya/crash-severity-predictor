from pydantic import BaseModel


class HospitalizationResponse(BaseModel):
    int_o_noint: int
    descripcion: str