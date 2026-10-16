from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from core.schemas.filters import FiltrosQuery


class Geometry(BaseModel):
    type: str
    coordinates: Any

    model_config = ConfigDict(
        extra="allow"
    )


class Feature(BaseModel):
    type: str = "Feature"

    geometry: Geometry

    properties: dict[str, Any]

    model_config = ConfigDict(
        extra="allow"
    )


class FeatureCollection(BaseModel):
    type: str = "FeatureCollection"

    features: list[Feature]

    model_config = ConfigDict(
        extra="allow"
    )

# -- /api/mapa/coropletico --------------------------------------------

class CoropleticoQuery(FiltrosQuery):
    nivel: Literal["depto", "municipio"] = Field(
        "depto",
        description="Nivel territorial del mapa",
    )
