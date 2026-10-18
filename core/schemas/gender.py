from pydantic import BaseModel


class GenderResponse(BaseModel):
    sexo_per: int
    descripcion: str