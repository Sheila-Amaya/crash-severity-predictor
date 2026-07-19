from pydantic import BaseModel


class AgeGroup80Response(BaseModel):
    g_edad_80ymas: int
    descripcion: str