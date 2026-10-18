# Datos

Microdatos del INE de hechos de tránsito 2018–2024, en tres archivos
independientes: hechos, vehículos involucrados y fallecidos y lesionados.
Cartografía: IDEG (límites departamentales y municipales). Licencias y forma
de citar: [LICENCIAS_DATOS.md](LICENCIAS_DATOS.md).

| Tabla | Filas |
|---|---|
| `hecho` | 52,488 |
| `fallecido_lesionado` | 71,942 (13,741 fallecidos, 58,201 lesionados) |

El esquema completo está en [db/schema.sql](../db/schema.sql).

## `num_corre` no sirve para unir archivos

Cada archivo del INE tiene su propio `num_corre`, que es el **correlativo de
fila de ese archivo** y se reinicia cada año. No identifica al hecho de
tránsito, por lo que **no se puede usar para unir víctimas o vehículos con
hechos**. Al comparar cada víctima con el hecho que tiene el mismo
`(num_corre, año)`, el municipio coincide solo en el 5.1 % de los casos, el
día en el 3.8 % y la hora en el 5.0 % (las cinco columnas a la vez: 0.07 %).

Por eso la tabla `fallecido_lesionado` guarda **los datos del evento que trae
el propio archivo de víctimas** (año, mes, día, hora, jornada, día de la
semana, municipio, departamento, tipo de evento, tipo de vehículo) y no tiene
llave foránea hacia `hecho`.

**Las estadísticas de víctimas (fallecidos, lesionados, letalidad) se calculan
siempre con las columnas de la propia víctima**, nunca a través de `hecho`.
El conteo de hechos se calcula por separado sobre la tabla `hecho`.

## Carga de víctimas

Script: `scripts/cargar_fallecido_lesionado.py` (migración
`db/migrations/001_fallecido_lesionado_con_datos_propios.sql`).

- La migración ya está aplicada en la semilla de la base de Docker: no hace
  falta volver a ejecutarla.
- La prueba en seco (`python scripts/cargar_fallecido_lesionado.py`) funciona
  contra la base local con la `DB_URL` de `app_lectura`.
- `--ejecutar` escribe, así que necesita el usuario `postgres`
  (`postgresql+psycopg2://postgres:<POSTGRES_PASSWORD>@127.0.0.1:5433/severidad_vial`)
  y, al terminar, `restaurar`/`generar_semilla` para conservar el resultado
  (ver [db/seed/LEEME.md](../db/seed/LEEME.md)).

Las correcciones aplicadas a los datos de origen están en
`data/clean/correcciones_fallecido_lesionado.csv`.
