from pydantic import BaseModel


class QuinquennialAgeResponse(BaseModel):
    edad_quinquenales: int
    descripcion: str

    g_edad_60ymas: int
    descripcion_60: str

    g_edad_80ymas: int
    descripcion_80: str