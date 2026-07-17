from pydantic import BaseModel


class DepartmentResponse(BaseModel):
    depto_ocu: int
    nombre: str