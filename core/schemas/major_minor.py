from pydantic import BaseModel


class MajorMinorResponse(BaseModel):
    mayor_menor: int
    descripcion: str