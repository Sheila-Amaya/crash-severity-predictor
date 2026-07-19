from pydantic import BaseModel


class HourGroupResponse(BaseModel):
    g_hora: int
    descripcion: str