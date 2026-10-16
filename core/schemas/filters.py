from pydantic import BaseModel, field_validator, model_validator


# -- Códigos válidos --------------------------------------------------
# Obtenidos de la base con SELECT DISTINCT sobre hecho y fallecido_lesionado
# (municipios: cat_municipio). tests/test_filters.py verifica, en modo
# integración, que coincidan con la base.

ANIOS = frozenset(range(2018, 2025))
DEPTOS = frozenset(range(1, 23))
G_HORA_5 = frozenset({1, 2, 3, 4})
DIAS_SEMANA = frozenset(range(1, 8))
TIPOS_EVENTO = frozenset({1, 2, 3, 4, 5, 6, 7, 8, 99})
TIPOS_VEHICULO = frozenset({
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 23, 24, 99,
})
SEXOS = frozenset({1, 2, 9})
EDADES_QUINQUENALES = frozenset(range(1, 19))

# Código DDMM: los municipios son correlativos dentro de cada departamento.
MUNICIPIOS_POR_DEPTO = {
    1: 17, 2: 8, 3: 16, 4: 16, 5: 14, 6: 14, 7: 19, 8: 8, 9: 24, 10: 21, 11: 9,
    12: 30, 13: 33, 14: 21, 15: 8, 16: 17, 17: 14, 18: 5, 19: 11, 20: 11, 21: 7, 22: 17,
}
MUNICIPIOS = frozenset(
    depto * 100 + numero
    for depto, cantidad in MUNICIPIOS_POR_DEPTO.items()
    for numero in range(1, cantidad + 1)
)

CODIGOS_VALIDOS = {
    "anio": ANIOS,
    "depto": DEPTOS,
    "municipio": MUNICIPIOS,
    "g_hora_5": G_HORA_5,
    "dia_sem_ocu": DIAS_SEMANA,
    "tipo_eve": TIPOS_EVENTO,
    "tipo_veh": TIPOS_VEHICULO,
    "sexo": SEXOS,
    "edad_quinquenales": EDADES_QUINQUENALES,
}

# Filtros de evento: aplican a hechos y a víctimas, cada uno con sus columnas.
FILTROS_EVENTO = ("anio", "depto", "municipio", "g_hora_5", "dia_sem_ocu", "tipo_eve")

# Filtros de víctima: solo aplican a víctimas; con ellos "hechos" es null.
FILTROS_VICTIMA = ("tipo_veh", "sexo", "edad_quinquenales")


def describir_codigos(campo: str) -> str:
    if campo == "municipio":
        return "un código DDMM de cat_municipio (340 municipios)"

    return ", ".join(str(code) for code in sorted(CODIGOS_VALIDOS[campo]))


# -- Esquema de filtros ------------------------------------------------

class FiltrosQuery(BaseModel):
    """
    Filtros opcionales por query string, compartidos por los endpoints
    de estadísticas y mapas.
    """

    anio: int | None = None
    depto: int | None = None
    municipio: int | None = None
    g_hora_5: int | None = None
    dia_sem_ocu: int | None = None
    tipo_eve: int | None = None
    tipo_veh: int | None = None
    sexo: int | None = None
    edad_quinquenales: int | None = None

    @field_validator(*CODIGOS_VALIDOS.keys())
    @classmethod
    def validar_codigo(cls, value, info):
        if value is not None and value not in CODIGOS_VALIDOS[info.field_name]:
            raise ValueError(
                f"{info.field_name}={value} no existe en los datos. "
                f"Valores válidos: {describir_codigos(info.field_name)}"
            )

        return value

    @model_validator(mode="after")
    def validar_municipio_en_depto(self):
        if (
            self.depto is not None
            and self.municipio is not None
            and self.municipio // 100 != self.depto
        ):
            raise ValueError(
                f"El municipio {self.municipio} no pertenece al departamento {self.depto}."
            )

        return self

    @property
    def tiene_filtros_victima(self) -> bool:
        return any(getattr(self, campo) is not None for campo in FILTROS_VICTIMA)

    def solo_filtros(self) -> "FiltrosQuery":
        """
        Devuelve únicamente los filtros, sin los parámetros propios de cada
        endpoint (subclases como SerieQuery o RankingQuery).
        """
        return FiltrosQuery.model_validate(
            self.model_dump(include=set(FiltrosQuery.model_fields))
        )
