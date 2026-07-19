from pydantic import BaseModel


class DayResponse(BaseModel):
    dia_sem_ocu: int
    nombre: str