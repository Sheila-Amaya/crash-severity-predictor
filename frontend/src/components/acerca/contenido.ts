// Textos y cifras de la página "Acerca de".
// Modelo v1 verificado contra random_forest.pkl y test.parquet; las cifras de
// víctimas, hechos, años y departamentos se leen de la API, no se escriben aquí.

import type { NombreIcono } from './Iconos'

export const ARBOLES = 200
export const PRUEBA = { registros: 14_389, porcentaje: 20 }

export const VARIABLES = [
  'Tipo de evento',
  'Tipo de vehículo',
  'Departamento',
  'Jornada',
  'Día de la semana',
  'Sexo',
  'Grupo de edad',
  'Mayor o menor de edad',
]

/** Métricas del modelo en los datos de prueba (escala de 0 a 1). */
export const METRICAS = [
  { nombre: 'Accuracy', valor: 0.6949, significado: 'De cada 100 registros de prueba, acierta la clase en ~69.' },
  { nombre: 'F1 ponderado', valor: 0.7233, significado: 'Equilibrio entre aciertos y omisiones de ambas clases, según su tamaño.' },
  { nombre: 'ROC-AUC', valor: 0.7336, significado: 'Qué tan bien ordena el riesgo: 0.5 es azar y 1, perfecto.' },
  { nombre: 'Recall de fallecidos', valor: 0.6245, significado: 'De cada 100 fallecidos reales, el modelo detecta ~62.' },
  { nombre: 'Precisión de fallecidos', valor: 0.3382, significado: 'De cada 100 alertas «Fallecido», ~34 son correctas.' },
]

export const FLUJO: { paso: string; detalle: string; icono: NombreIcono }[] = [
  { paso: 'Datos INE', detalle: 'Hechos, víctimas y vehículos, 2018–2024', icono: 'datos' },
  { paso: 'Limpieza', detalle: 'Códigos corregidos y catálogos', icono: 'filtro' },
  { paso: 'Modelo', detalle: 'Random Forest y SHAP', icono: 'arbol' },
  { paso: 'API', detalle: 'FastAPI sobre PostgreSQL/PostGIS', icono: 'servidor' },
  { paso: 'Mapa y simulador', detalle: 'Esta aplicación', icono: 'mapa' },
]

export interface Figura {
  numero: string
  src: string
  ancho: number
  alto: number
  titulo: string
  alt: string
  pie: string
}

// Verificado en notebooks/10_model_interpretability.ipynb y reproducido con
// random_forest.pkl: barras = |SHAP| medio; enjambre = muestra de 500 registros
// de prueba (random_state=42); clase explicada = fallecido (classes_[0] = 1).

/** Figuras del modelo (fondo blanco): se muestran sin recortar ni alterar. */
export const FIGURAS: Figura[] = [
  {
    numero: '01',
    src: '/figuras/shap-resumen.png',
    ancho: 2369,
    alto: 1469,
    titulo: 'Qué variables pesan más',
    alt: 'Barras horizontales del valor SHAP absoluto medio por variable: tipo de evento, departamento y sexo encabezan; día de la semana y mayor o menor de edad son las de menor impacto. La primera barra está en rojo.',
    pie: 'Valor SHAP absoluto medio por variable: cuánto mueve cada una la predicción, sin importar si la empuja hacia fallecido o lesionado. El tipo de evento es la variable que más pesa (≈0.08), seguida del departamento y el sexo. El rojo solo resalta la primera barra.',
  },
  {
    numero: '02',
    src: '/figuras/shap-abejas.png',
    ancho: 2319,
    alto: 1375,
    titulo: 'Cómo empuja cada variable',
    alt: 'Gráfico de enjambre: por cada variable, puntos de colores entre azul y rojo a la izquierda y a la derecha de una línea central en cero.',
    pie: 'Cada punto es una víctima de una muestra de 500 registros de prueba: a la derecha empuja hacia fallecido y a la izquierda hacia lesionado. El color es el valor numérico del código de la variable (azul bajo, rojo alto), no una intensidad: en departamento o tipo de evento, «alto» o «bajo» solo es el número del código.',
  },
  {
    numero: '03',
    src: '/figuras/shap-cascada.png',
    ancho: 1294,
    alto: 799,
    titulo: 'Una predicción, paso a paso',
    alt: 'Gráfico de cascada de una predicción: parte de 0.5, barras rojas suman y una barra azul resta, hasta llegar a 0.719.',
    pie: 'Ejemplo de una sola víctima. El modelo parte de un puntaje medio de 0.5 y llega a 0.719. En los datos, Petén y los atropellos tienen una proporción de fallecidos mayor que el promedio, y en este caso suman +0.11 cada uno; el vehículo bicicleta resta 0.11. Son asociaciones aprendidas de los datos, no causas.',
  },
  {
    numero: '04',
    src: '/figuras/arbol-decision.png',
    ancho: 2960,
    alto: 1184,
    titulo: 'Un árbol del bosque (ilustrativo)',
    alt: 'Diagrama de un árbol de decisión truncado a profundidad 3: la primera división es por grupo de edad y luego por sexo, departamento, tipo de vehículo, jornada y tipo de evento. Las cajas azules predominan en lesionado y las naranjas en fallecido.',
    pie: `Ilustrativo: uno de los ${ARBOLES} árboles, cortado a profundidad 3. La predicción promedia todos los árboles: uno solo no explica el modelo.`,
  },
]

/**
 * Caso de la FIG. 03: códigos de la figura traducidos con /api/catalogos y
 * /api/predecir/opciones; aportes SHAP reproducidos (base 0.4997, puntaje 0.7187).
 */
export const CASO_CASCADA = {
  base: '0.5',
  resultado: '0.719',
  filas: [
    { variable: 'Departamento', codigo: 17, valor: 'Petén', aporte: '+0.11' },
    { variable: 'Tipo de vehículo', codigo: 18, valor: 'Bicicleta', aporte: '−0.11' },
    { variable: 'Tipo de evento', codigo: 5, valor: 'Atropello', aporte: '+0.11' },
    { variable: 'Sexo', codigo: 1, valor: 'Hombre', aporte: '+0.06' },
    { variable: 'Grupo de edad', codigo: 10, valor: '45 - 49', aporte: '+0.03' },
    { variable: 'Día de la semana', codigo: 6, valor: 'Sábado', aporte: '+0.01' },
    { variable: 'Mayor o menor de edad', codigo: 1, valor: 'Mayor', aporte: '+0.01' },
    { variable: 'Jornada', codigo: 3, valor: 'Noche', aporte: '+0.00' },
  ],
  // Proporción de fallecidos en todos los datos (/api/resumen, verificado)
  nota: 'Proporción de fallecidos en los datos: Petén 34.6 %, atropellos 26.5 %, promedio 19.1 %. La bicicleta resta en este caso aunque, en el total de datos, su proporción (24.2 %, con solo 161 víctimas) no es menor que el promedio: SHAP mide el aporte de cada valor dentro de esta combinación concreta, no la tasa general de esa variable.',
}

/** Leyenda de colores del árbol (FIG. 04): colores por defecto de plot_tree. */
export const LEYENDA_ARBOL = {
  colores: [
    { clase: 'Lesionado', claro: '#d7ebfa', intenso: '#399de5', texto: 'Azul: predomina lesionado' },
    { clase: 'Fallecido', claro: '#fbeade', intenso: '#e58139', texto: 'Naranja: predomina fallecido' },
  ],
  intensidad: 'Más intenso = más puro (una sola clase domina la caja).',
  nota: 'Las cifras de cada caja corresponden a una muestra de entrenamiento con remuestreo, no al total de datos.',
}

/** Nota general sobre cómo leer las figuras SHAP. */
export const COMO_LEER = [
  'SHAP mide cuánto movió cada variable la predicción respecto al promedio del modelo.',
  'Son asociaciones aprendidas de los datos, no causas.',
  'Varias variables están codificadas como números (departamento, tipo de evento…): «alto» o «bajo» se refiere al número del código.',
]

export const SECCIONES = [
  { numero: '01', id: 'datos', etiqueta: 'Datos' },
  { numero: '02', id: 'modelo', etiqueta: 'Modelo' },
  { numero: '03', id: 'explicabilidad', etiqueta: 'Explicabilidad' },
  { numero: '04', id: 'uso-responsable', etiqueta: 'Uso responsable' },
  { numero: '05', id: 'codigo', etiqueta: 'Código' },
] as const
