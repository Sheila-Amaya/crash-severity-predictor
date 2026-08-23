from typing import Any
from pydantic import BaseModel, ConfigDict


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