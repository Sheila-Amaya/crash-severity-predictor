from pydantic import BaseModel


class HourGroup5Response(BaseModel):
    g_hora_5: int
    g_hora: int
    descripcion: str