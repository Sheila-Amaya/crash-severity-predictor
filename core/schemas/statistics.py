from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from core.schemas.filters import FiltrosQuery


# -- Query params por endpoint -----------------------------------------
# FastAPI no admite mezclar un modelo de query params con parámetros
# sueltos, por eso cada endpoint extiende FiltrosQuery con los suyos.

class SerieQuery(FiltrosQuery):
    agrupar: Literal["anio", "mes", "dia_sem", "jornada"] = Field(
        description="Dimensión de agrupación (jornada = g_hora_5)",
    )


class RankingQuery(FiltrosQuery):
    nivel: Literal["depto", "municipio"] = Field(
        "depto",
        description="Nivel territorial",
    )
    limite: int = Field(
        10,
        ge=1,
        le=340,
        description="Cantidad de posiciones (1-340)",
    )
    orden: Literal["fallecidos", "victimas", "letalidad"] = Field(
        "fallecidos",
        description="Criterio de orden (descendente)",
    )


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


# -- /api/estadisticas/serie ------------------------------------------

class FilaEstadistica(BaseModel):
    hechos: int | None
    victimas: int
    fallecidos: int
    lesionados: int
    letalidad: float | None


class PuntoSerie(FilaEstadistica):
    clave: int
    etiqueta: str


class SerieResponse(BaseModel):
    agrupar: str
    datos: list[PuntoSerie]
    nota: str | None = None


# -- /api/estadisticas/ranking ----------------------------------------

class FilaRanking(FilaEstadistica):
    posicion: int
    codigo: int
    nombre: str
    depto: int | None


class RankingResponse(BaseModel):
    nivel: str
    orden: str
    limite: int
    datos: list[FilaRanking]
    nota: str | None = None
