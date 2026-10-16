from pydantic import BaseModel, ConfigDict


# -- /api/catalogos ---------------------------------------------------

class CatalogoOpcion(BaseModel):
    id: int
    descripcion: str


class MunicipioOpcion(CatalogoOpcion):
    depto: int


class CatalogosResponse(BaseModel):
    anio: list[CatalogoOpcion]
    depto: list[CatalogoOpcion]
    municipio: list[MunicipioOpcion]
    g_hora_5: list[CatalogoOpcion]
    dia_sem_ocu: list[CatalogoOpcion]
    tipo_eve: list[CatalogoOpcion]
    tipo_veh: list[CatalogoOpcion]
    sexo: list[CatalogoOpcion]
    edad_quinquenales: list[CatalogoOpcion]


# -- /api/resumen -----------------------------------------------------

class ResumenResponse(BaseModel):
    hechos: int | None
    victimas: int
    fallecidos: int
    lesionados: int
    letalidad: float | None
    nota: str | None = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "hechos": 52488,
                "victimas": 71942,
                "fallecidos": 13741,
                "lesionados": 58201,
                "letalidad": 19.1,
                "nota": None,
            }
        }
    )
