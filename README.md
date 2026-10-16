# crash-severity-predictor
Machine learning system for predicting traffic crash severity in Guatemala using INE microdata (2018-2024).

API REST (FastAPI + PostgreSQL/PostGIS) con estadísticas, mapas y un modelo
Random Forest que clasifica la severidad de una víctima (fallecido o lesionado),
y una aplicación web (React + MapLibre, en `frontend/`) con el mapa, el
simulador y la página "Acerca de".

![Mapa de víctimas por departamento](docs/capturas/mapa.webp)

## Instalación

Requisitos: Python 3.14, una base PostgreSQL con PostGIS (esquema en `db/schema.sql`).

```bash
python -m venv .venv
.venv\Scripts\activate            # Windows  (Linux/macOS: source .venv/bin/activate)
pip install -r requirements.txt   # producción
pip install -r requirements-dev.txt  # pruebas y notebooks
```

El modelo `data/models/random_forest.pkl` no está en git (tamaño). Se genera
con `notebooks/06_model_random_forest.ipynb`. Sin él, la API arranca igual y
`/api/predecir` responde 503.

### Variables de entorno

Se leen de `.env` en la raíz del proyecto (no se sube a git). Ejemplo:

```env
DB_URL=postgresql://<usuario>:<contraseña>@<host>:5432/<base>
CORS_ORIGINS=http://localhost:5173
```

`http://localhost:5173` es el servidor de desarrollo del frontend (Vite).

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DB_URL` | Sí | Cadena de conexión SQLAlchemy a PostgreSQL, p. ej. `postgresql://<usuario>:<contraseña>@<host>:5432/<base>` |
| `CORS_ORIGINS` | No | Orígenes permitidos, separados por coma. Vacío = ninguno. `*` se ignora |

### Ejecutar

```bash
uvicorn core.app:app --reload
```

Documentación interactiva: `http://localhost:8000/docs`.

En Windows, `.\dev.ps1` abre dos ventanas de PowerShell: la API (con el `.venv` activado) y el frontend (`npm run dev`, en `http://localhost:5173`).

### Frontend

Requisitos: Node.js 20, 22 o 24+.

```bash
cd frontend
npm install
cp .env.example .env     # VITE_API_URL=http://localhost:8000 (sin secretos)
npm run dev              # http://localhost:5173, con proxy de /api hacia la API
```

| Página | Qué muestra |
|---|---|
| `/` Mapa | Víctimas por departamento o municipio (burbujas, áreas o 3D), filtros, KPIs, ranking y evolución. |
| `/simulador` | Estima si una víctima resultaría fallecida o lesionada y explica los 3 factores que más pesaron (SHAP). |
| `/acerca` | Origen de los datos, flujo del sistema, métricas del modelo (Tabla I) y uso responsable. |

| Simulador | Tema claro | Móvil |
|---|---|---|
| ![Simulador con resultado](docs/capturas/simulador.webp) | ![Mapa en tema claro](docs/capturas/mapa-claro.webp) | ![Mapa en móvil](docs/capturas/mapa-movil.webp) |

Instalación completa, variables, scripts, compilación para producción y
problemas frecuentes: [frontend/README.md](frontend/README.md).

### Pruebas

```bash
pytest                      # todo; las de integración se omiten si no hay DB_URL
pytest -m "not integration" # solo pruebas unitarias (mocks, sin base de datos)
pytest -m integration       # solo contra la base real (únicamente SELECT)
```

## Datos

Fuente: microdatos del INE de hechos de tránsito 2018–2024, en tres archivos
independientes: hechos, vehículos involucrados y fallecidos y lesionados.
Cartografía: IDEG (límites departamentales y municipales).

### `num_corre` no sirve para unir archivos

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

Carga de víctimas: `scripts/cargar_fallecido_lesionado.py`
(migración `db/migrations/001_fallecido_lesionado_con_datos_propios.sql`).
Las correcciones aplicadas a los datos de origen están en
`data/clean/correcciones_fallecido_lesionado.csv`.

| Tabla | Filas |
|---|---|
| `hecho` | 52,488 |
| `fallecido_lesionado` | 71,942 (13,741 fallecidos, 58,201 lesionados) |

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
  aplican a víctimas. Como no hay forma de vincular víctimas con hechos, en ese
  caso **`hechos` es `null`** y la respuesta incluye un campo `nota` que lo
  explica.

## Endpoints

Todas las rutas usan el prefijo `/api`. Los ejemplos asumen `http://localhost:8000`.

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
local (TreeExplainer) hacia la clase predicha, en puntos porcentuales de
probabilidad, con `efecto` `aumenta` o `disminuye`.

```bash
curl -X POST http://localhost:8000/api/predecir \
  -H "Content-Type: application/json" \
  -d '{"tipo_eve": 2, "tipo_veh": 18, "g_hora_5": 3, "dia_sem_ocu": 6, "sexo_per": 1, "edad_quinquenales": 7, "mayor_menor": 1, "depto_ocu": 1}'
```

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
