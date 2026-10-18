# API

Referencia de la API REST (FastAPI). Todas las rutas de datos usan el prefijo
`/api`. Los ejemplos asumen la API de desarrollo en `http://localhost:8000`,
donde también está la documentación interactiva (`/docs`). En el stack de
Docker la API se consulta a través de nginx (`http://localhost:8080/api/...`) y
`/docs` no se publica.

## Indicadores

### Letalidad (índice de riesgo)

```
letalidad = fallecidos / (fallecidos + lesionados) * 100
```

Se calcula sobre la tabla de víctimas (`fallecido_lesionado`), con dos
decimales. Es `null` cuando no hay víctimas que cumplan los filtros.
Sin filtros: 13,741 / 71,942 * 100 = **19.1 %**.

`hechos` es un conteo aparte (tabla `hecho`) y no interviene en la letalidad.

### Filtros

Todos los endpoints de estadísticas y el mapa coroplético aceptan estos query
params opcionales. Solo se aceptan códigos que existen en los datos; un código
inexistente devuelve **422** con los valores válidos.

| Filtro | Tipo | Valores |
|---|---|---|
| `anio` | evento | 2018–2024 |
| `depto` | evento | 1–22 |
| `municipio` | evento | código DDMM de `cat_municipio` (340); debe pertenecer a `depto` si se envían ambos |
| `g_hora_5` | evento | 1 Mañana, 2 Tarde, 3 Noche, 4 Ignorada |
| `dia_sem_ocu` | evento | 1 Lunes … 7 Domingo |
| `tipo_eve` | evento | 1–8, 99 Ignorado |
| `tipo_veh` | víctima | 1–16, 18, 20, 22–24, 99 Ignorado (tipo de vehículo de la víctima) |
| `sexo` | víctima | 1 Hombre, 2 Mujer, 9 Ignorado |
| `edad_quinquenales` | víctima | 1–17, 18 Ignorado |

Las opciones con su descripción se obtienen de `GET /api/catalogos`.

**Regla de filtros de evento y de víctima:**

- Los **filtros de evento** se aplican a hechos y a víctimas por separado,
  cada uno con sus propias columnas (en `hecho`, el departamento se deriva del
  código DDMM del municipio).
- Los **filtros de víctima** (`tipo_veh`, `sexo`, `edad_quinquenales`) solo se
  aplican a víctimas. Como no hay forma de vincular víctimas con hechos (ver
  [DATOS.md](DATOS.md)), en ese caso **`hechos` es `null`** y la respuesta
  incluye un campo `nota` que lo explica.

## Endpoints

### `GET /` — estado de la API

```bash
curl http://localhost:8000/
```

### `GET /api/catalogos` — opciones de los menús de filtros

Para cada filtro, la lista `{id, descripcion}` de los códigos que existen en
los datos (municipios incluyen `depto`). Los códigos ignorados se muestran
como "Ignorado".

```bash
curl http://localhost:8000/api/catalogos
```

### `GET /api/resumen` — totales

Devuelve `hechos`, `victimas`, `fallecidos`, `lesionados`, `letalidad` y `nota`.

```bash
curl "http://localhost:8000/api/resumen"
curl "http://localhost:8000/api/resumen?anio=2023&depto=1"
curl "http://localhost:8000/api/resumen?anio=2023&sexo=2"   # hechos = null
```

### `GET /api/estadisticas/serie` — serie por dimensión

`agrupar` (obligatorio): `anio`, `mes`, `dia_sem` o `jornada` (= `g_hora_5`).
Cada punto trae `clave`, `etiqueta`, `hechos`, `victimas`, `fallecidos`,
`lesionados` y `letalidad`.

```bash
curl "http://localhost:8000/api/estadisticas/serie?agrupar=anio"
curl "http://localhost:8000/api/estadisticas/serie?agrupar=mes&anio=2024&depto=5"
```

### `GET /api/estadisticas/ranking` — ranking territorial

| Parámetro | Valores | Por defecto |
|---|---|---|
| `nivel` | `depto`, `municipio` | `depto` |
| `limite` | 1–340 | 10 |
| `orden` | `fallecidos`, `victimas`, `letalidad` (descendente) | `fallecidos` |

Solo incluye lugares con víctimas que cumplan los filtros.

```bash
curl "http://localhost:8000/api/estadisticas/ranking?nivel=depto&limite=10"
curl "http://localhost:8000/api/estadisticas/ranking?nivel=municipio&limite=5&depto=1&orden=letalidad"
```

### `GET /api/mapa/coropletico` — mapa coroplético (GeoJSON)

`nivel`: `depto` (por defecto) o `municipio`. Geometría simplificada con
`ST_SimplifyPreserveTopology` (tolerancia 0.002°, 5 decimales): unos 96 KB por
departamento y 369 KB por municipio. Propiedades de cada feature: `codigo`,
`nombre`, `depto`, `hechos`, `total` (víctimas), `fallecidos`, `lesionados`,
`letalidad`. Todos los filtros afectan los conteos; `depto` y `municipio`
además limitan las geometrías devueltas. No hay coordenadas por hecho, por lo
que el mapa es solo coroplético.

```bash
curl "http://localhost:8000/api/mapa/coropletico?nivel=depto"
curl "http://localhost:8000/api/mapa/coropletico?nivel=municipio&depto=1&anio=2023"
```

### `POST /api/predecir` — severidad de una víctima

Entrada: `tipo_eve`, `tipo_veh`, `g_hora_5`, `dia_sem_ocu`, `sexo_per`,
`edad_quinquenales`, `mayor_menor`, `depto_ocu`. Solo se aceptan los códigos
que el modelo vio en entrenamiento (`data/clean/train.parquet`; ver
`/api/predecir/opciones`); los códigos
"Ignorado" (99, 9 y `g_hora_5=4`) se imputaron antes de entrenar y se
rechazan con 422.

Salida: `resultado`, `clase` (1 Fallecido, 2 Lesionado), `confianza`,
`probabilidades` y `factores`: las 3 variables con mayor contribución SHAP
local (TreeExplainer) hacia la clase predicha, en puntos sobre 100, con
`efecto` `aumenta` o `disminuye`.

`confianza` y `probabilidades` vienen de `predict_proba` y se expresan sobre
100, pero son el **puntaje del modelo**, no la probabilidad real de fallecer:
el modelo se entrenó con las clases equilibradas, así que su puntaje medio es
0.5 (50) y no el 19.1 % de fallecidos de los datos. El simulador los muestra
como "puntaje de severidad (0 a 1)". Los nombres de los campos no cambian.

```bash
curl -X POST http://localhost:8000/api/predecir \
  -H "Content-Type: application/json" \
  -d '{"tipo_eve": 2, "tipo_veh": 18, "g_hora_5": 3, "dia_sem_ocu": 6, "sexo_per": 1, "edad_quinquenales": 7, "mayor_menor": 1, "depto_ocu": 1}'
```

Si falta el modelo (`data/models/random_forest.pkl`), la API arranca igual y
este endpoint responde **503**.

### `GET /api/predecir/opciones` — opciones del simulador

Para cada una de las 8 variables del modelo (`tipo_eve`, `tipo_veh`,
`g_hora_5`, `dia_sem_ocu`, `sexo_per`, `edad_quinquenales`, `mayor_menor`,
`depto_ocu`), la lista `{id, descripcion}` de los códigos que el modelo vio en
entrenamiento, más un campo `nota`. Los códigos salen de
`data/clean/train.parquet`, la misma fuente con la que `/api/predecir` valida
la entrada, así que toda opción ofrecida es aceptada por el modelo. No incluye
99, 9, `g_hora_5=4` ni `tipo_veh=15`; `edad_quinquenales=18` ("Ignorado") sí se
incluye porque se conservó como categoría en el entrenamiento. Las
descripciones salen de los catálogos de la base.

Los filtros del dashboard usan `/api/catalogos`; el simulador usa este endpoint.

```bash
curl http://localhost:8000/api/predecir/opciones
```

### `GET /api/catalogs/*` — catálogos individuales

Catálogos completos de la base: `departamentos`, `municipios/{depto_ocu}`,
`dias-semana`, `grupos-hora`, `grupos-hora-5`, `tipos-evento`,
`tipos-vehiculo`, `marcas-vehiculo`, `grupos-modelo`,
`modelos-vehiculo/{marca_veh}`, `colores-vehiculo`, `sexo`, `grupos-edad-80`,
`grupos-edad-60`, `edad-quinquenal`, `mayor-menor`, `estado-conductor`,
`internado`, `fallecido-lesionado`.

```bash
curl http://localhost:8000/api/catalogs/departamentos
curl http://localhost:8000/api/catalogs/municipios/1
```

## Límites en el stack de Docker

nginx limita por IP: 10 peticiones/s en `/api` (ráfaga 30) y 30 por minuto en
`POST /api/predecir` (ráfaga 10). Al superarlos responde **429** con
`{"message": "...", "errors": []}` y la cabecera `Retry-After`. El cuerpo de
una petición no puede pasar de 4 KB.
