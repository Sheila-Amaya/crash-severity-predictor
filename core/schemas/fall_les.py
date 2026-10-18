from pydantic import BaseModel


class FallLesResponse(BaseModel):
    fall_les: int
    nombre: str