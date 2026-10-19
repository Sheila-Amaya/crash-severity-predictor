# Crash Severity — Siniestralidad vial en Guatemala

> **English summary.** Interactive map, statistics API and Random Forest model of traffic-crash victim severity in Guatemala (INE microdata, 2018–2024).
> SHAP explains each prediction; the stack runs with Docker (React + MapLibre, nginx, FastAPI, PostgreSQL/PostGIS).

Mapa interactivo y API de estadísticas sobre las víctimas de hechos de tránsito
en Guatemala entre 2018 y 2024: 71,942 víctimas (13,741 fallecidos y 58,201
lesionados) en 52,488 hechos, con datos del INE ([notas sobre los
datos](docs/DATOS.md)). Un modelo Random Forest estima si una víctima
resultaría fallecida o lesionada y explica cada estimación con SHAP.

<!-- Demo: pendiente -->

![Mapa de burbujas de víctimas por departamento en tema oscuro, con filtros, cifras clave y ranking de fallecidos](docs/capturas/mapa.webp)

## Qué hace

- **Mapa interactivo** por departamento o municipio, en tres vistas: burbujas,
  áreas y 3D.
- **Filtros** por año, territorio, jornada, día, tipo de evento y vehículo,
  sexo y edad, con indicadores clave y letalidad.
- **Ranking y evolución**: lugares con más víctimas y series por año, mes, día
  de la semana y jornada.
- **Simulador de severidad**: puntaje del modelo para un caso y los tres
  factores que más pesaron (SHAP).
- **Página Acerca de**: origen de los datos, flujo del sistema, métricas,
  explicabilidad y uso responsable.
- **API REST documentada** con FastAPI ([docs/API.md](docs/API.md)).

| Simulador | Tema claro | Móvil |
|---|---|---|
| ![Simulador con un caso calculado: clase Fallecido, puntaje de severidad 0.716 y los tres factores SHAP](docs/capturas/simulador.webp) | ![Mapa de burbujas en tema claro](docs/capturas/mapa-claro.webp) | ![Mapa de burbujas en un teléfono, tema oscuro](docs/capturas/mapa-movil.webp) |

## Arquitectura

```
Navegador
   │   HTTPS (Caddy, en el servidor)
   ▼
nginx ─────── aplicación web: React + MapLibre
   │   /api
   ▼
FastAPI ───── estadísticas, mapa y modelo (Random Forest + SHAP)
   │   rol de solo lectura
   ▼
PostgreSQL 17 + PostGIS 3.5
```

Todo corre en contenedores Docker. La API carga un modelo Random Forest
(scikit-learn) y calcula las explicaciones con SHAP en cada predicción.

## Inicio rápido

Requisitos: Docker con Docker Compose v2.24 o superior.

```bash
git clone https://github.com/Sheila-Amaya/crash-severity-predictor.git && cd crash-severity-predictor
cp .env.example .env                   # define POSTGRES_PASSWORD y APP_DB_PASSWORD
bash scripts/descargar-artefactos.sh   # verifica modelo y semilla (db/seed/LEEME.md)
docker compose up -d --build           # app en http://localhost:8080
```

Modelo y semilla de la base: [db/seed/LEEME.md](db/seed/LEEME.md). Para
publicar en un servidor con dominio y HTTPS: [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md).
En servidores ARM (por ejemplo, Oracle Cloud Always Free) se suma `docker-compose.arm64.yml`: [Servidor ARM](docs/DESPLIEGUE.md#12-servidor-arm-oracle-cloud-always-free).

## Desarrollo local

Requisitos: Python 3.14, Node.js 20, 22 o 24+ y Docker.

```powershell
python -m venv .venv; .venv\Scripts\activate   # Linux/macOS: source .venv/bin/activate
pip install -r requirements-dev.txt
npm --prefix frontend install
.\dev.ps1                                       # base en 127.0.0.1, API (uvicorn) y frontend (Vite)
```

Pruebas:

```bash
pytest -m "not integration"    # unitarias, sin base de datos
pytest -m integration          # contra la base local (antes: .\dev.ps1 -SoloBase)
npm --prefix frontend test     # frontend (Vitest)
```

Detalles del frontend: [frontend/README.md](frontend/README.md). Variables y
problemas frecuentes: [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md#11-referencia-del-stack-de-docker).

## API

| Método | Ruta | Para qué sirve |
|---|---|---|
| `GET` | `/api/catalogos` | Opciones de los filtros |
| `GET` | `/api/resumen` | Totales de hechos, víctimas, fallecidos, lesionados y letalidad |
| `GET` | `/api/estadisticas/serie` | Serie por año, mes, día de la semana o jornada |
| `GET` | `/api/estadisticas/ranking` | Ranking de departamentos o municipios |
| `GET` | `/api/mapa/coropletico` | GeoJSON con los conteos por territorio |
| `POST` | `/api/predecir` | Severidad estimada de una víctima, con sus factores SHAP |
| `GET` | `/api/predecir/opciones` | Códigos que acepta el simulador |
| `GET` | `/api/catalogs/*` | Catálogos individuales de la base |

El resultado de `/api/predecir` es un **puntaje del modelo entre 0 y 1, no la
probabilidad real de fallecer**: el modelo se entrenó con las clases
equilibradas, así que su puntaje medio es 0.5, mientras que en los datos los
fallecidos son el 19.1 %. Filtros, parámetros y ejemplos:
[docs/API.md](docs/API.md).

## Modelo y explicabilidad

El modelo es un **Random Forest de 200 árboles** que clasifica a cada víctima
como fallecida o lesionada a partir de 8 variables del hecho y de la persona.
Se entrenó con 57,553 registros y se evaluó en 14,389 registros de prueba
(partición estratificada 80/20), con las clases equilibradas
(`class_weight="balanced"`, sin generar datos sintéticos).

**Métricas del modelo — evaluación en datos de prueba**

| Métrica | Valor |
|---|---|
| Accuracy | 0.6949 |
| F1 ponderado | 0.7233 |
| ROC-AUC | 0.7336 |
| Recall de fallecidos | 0.6245 |
| Precisión de fallecidos | 0.3382 |

**Cómo leer estas figuras**

- SHAP mide cuánto movió cada variable la predicción respecto al promedio del
  modelo.
- Son asociaciones aprendidas de los datos, no causas.
- Varias variables están codificadas como números (departamento, tipo de
  evento…): «alto» o «bajo» se refiere al número del código.

Las etiquetas de las figuras están en inglés: *Accident Type* (tipo de evento),
*Department* (departamento), *Gender* (sexo), *Age Group* (grupo de edad),
*Vehicle Type* (tipo de vehículo), *Time Slot* (jornada), *Day of the Week*
(día de la semana) y *Age Status* (mayor o menor de edad). Las figuras explican
la clase fallecido.

### Qué variables pesan más

![Barras horizontales del valor SHAP absoluto medio por variable: tipo de evento, departamento y sexo encabezan; día de la semana y mayor o menor de edad son las de menor impacto. La primera barra está en rojo](docs/img/shap-resumen.png)

Valor SHAP absoluto medio por variable: cuánto mueve cada una la predicción,
sin importar si la empuja hacia fallecido o lesionado. El tipo de evento es la
variable que más pesa (≈0.08), seguida del departamento (≈0.07) y el sexo
(≈0.06); el día de la semana y si la víctima es mayor o menor de edad son las
que menos (≈0.015). El rojo solo resalta la primera barra.

### Cómo empuja cada variable, víctima por víctima

![Gráfico de enjambre: por cada variable, puntos de colores entre azul y rojo distribuidos a la izquierda y a la derecha de una línea central en cero](docs/img/shap-abejas.png)

Cada punto es una víctima de una muestra de 500 registros de prueba. A la
derecha, esa variable empuja la predicción hacia fallecido; a la izquierda,
hacia lesionado. El color es el valor numérico del código de la variable
(azul = bajo, rojo = alto), no una intensidad: en departamento o tipo de
evento, «alto» o «bajo» solo es el número del código. Donde hay solo dos
códigos se lee directo: en sexo, los puntos rojos (2 = mujer) quedan a la
izquierda y los azules (1 = hombre) a la derecha; en mayor o menor de edad, los
rojos (2 = menor) quedan a la izquierda.

### Una predicción explicada paso a paso

![Gráfico de cascada de una predicción: parte de 0.5, barras rojas suman y una barra azul resta, hasta llegar a 0.719](docs/img/shap-cascada.png)

Ejemplo de una sola víctima. El modelo parte de un puntaje medio de 0.5 y
llega a 0.719. En los datos, Petén y los atropellos tienen una proporción de
fallecidos mayor que el promedio, y en este caso suman +0.11 cada uno; el
vehículo bicicleta resta 0.11. Son asociaciones aprendidas de los datos, no
causas.

| Variable | Valor (código) | Aporte |
|---|---|---|
| Departamento | Petén (17) | +0.11 |
| Tipo de vehículo | Bicicleta (18) | −0.11 |
| Tipo de evento | Atropello (5) | +0.11 |
| Sexo | Hombre (1) | +0.06 |
| Grupo de edad | 45 - 49 (10) | +0.03 |
| Día de la semana | Sábado (6) | +0.01 |
| Mayor o menor de edad | Mayor (1) | +0.01 |
| Jornada | Noche (3) | +0.00 |

Proporción de fallecidos en los datos: Petén 34.6 %, atropellos 26.5 %,
promedio 19.1 %. La bicicleta resta en este caso aunque, en el total de datos,
su proporción (24.2 %, con solo 161 víctimas) no es menor que el promedio: SHAP
mide el aporte de cada valor dentro de esta combinación concreta, no la tasa
general de esa variable.

### Un árbol del bosque (ilustrativo)

![Diagrama de un árbol de decisión truncado a profundidad 3: la primera división es por grupo de edad y luego por sexo, departamento, tipo de vehículo, jornada y tipo de evento. Las cajas azules predominan en lesionado y las naranjas en fallecido](docs/img/arbol-decision.png)

Ilustrativo: es uno de los 200 árboles del bosque, cortado a profundidad 3
(los nodos "(...)" continúan). La predicción final promedia los 200 árboles,
así que un árbol aislado no explica el modelo.

- **Colores:** azul, predomina lesionado; naranja, predomina fallecido. Más
  intenso = más puro (una sola clase domina la caja).
- Las cifras de cada caja corresponden a una muestra de entrenamiento con
  remuestreo, no al total de datos.

## Estructura del repositorio

```
core/        API FastAPI: rutas, servicios, esquemas y carga del modelo
data/        datos limpios, particiones de entrenamiento y prueba, métricas y modelos
db/          esquema SQL, migraciones, scripts del contenedor y semilla
deploy/      configuración de Caddy, nginx de servidor y cron de respaldos
docs/        despliegue, API, datos, capturas y figuras
frontend/    aplicación web (React, TypeScript, MapLibre, Tailwind)
notebooks/   EDA, limpieza, modelado y carga a la base
scripts/     carga de datos, descarga de artefactos, respaldos y verificación
tests/       pruebas de la API (pytest)
```

## Uso responsable

- Clasifica la severidad **dado que el hecho ya ocurrió**; no predice accidentes.
- Con una precisión de fallecidos de 0.3382, solo 1 de cada 3 alertas «Fallecido» es real: es apoyo a la decisión y no sustituye el criterio de las autoridades.
- Usa datos agregados y anonimizados del INE, sin ubicaciones exactas ni datos personales.

## Fuentes de datos

Datos: INE Guatemala (CC BY), procesados y depurados para este proyecto. Límites: IDEG/SEGEPLAN. Contexto cartográfico: Natural Earth.

## Licencia

Código bajo licencia [MIT](LICENSE).
