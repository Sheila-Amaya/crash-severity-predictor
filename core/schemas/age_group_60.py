from pydantic import BaseModel


class AgeGroup60Response(BaseModel):
    g_edad_60ymas: int
    descripcion: str

    g_edad_80ymas: int
    descripcion_80: str