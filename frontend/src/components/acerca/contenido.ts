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

/** Figuras del modelo (fondo blanco): se muestran sin recortar ni alterar. */
export const FIGURAS: Figura[] = [
  {
    numero: '01',
    src: '/figuras/shap-resumen.png',
    ancho: 2369,
    alto: 1469,
    titulo: 'Qué variables pesan más',
    alt: 'Barras horizontales del valor SHAP medio por variable: tipo de evento, departamento y sexo encabezan; día de la semana y mayor o menor de edad son las de menor impacto.',
    pie: 'Valor SHAP medio por variable. El tipo de evento es la que más pesa (≈0.08), seguido del departamento y el sexo.',
  },
  {
    numero: '02',
    src: '/figuras/shap-abejas.png',
    ancho: 2319,
    alto: 1375,
    titulo: 'Cómo empuja cada variable',
    alt: 'Gráfico de enjambre: por cada variable, puntos de colores entre azul y rojo a la izquierda y a la derecha de una línea central en cero.',
    pie: 'Cada punto es una víctima: a la derecha empuja hacia fallecido y a la izquierda hacia lesionado. El color es el código de la variable.',
  },
  {
    numero: '03',
    src: '/figuras/shap-cascada.png',
    ancho: 1294,
    alto: 799,
    titulo: 'Una predicción, paso a paso',
    alt: 'Gráfico de cascada de una predicción: parte de 0.5, barras rojas suman y una barra azul resta, hasta llegar a 0.719.',
    pie: 'Una sola víctima: del valor medio 0.5 a 0.719. Petén y atropello suman 0.11 cada uno; bicicleta resta 0.11.',
  },
  {
    numero: '04',
    src: '/figuras/arbol-decision.png',
    ancho: 2960,
    alto: 1184,
    titulo: 'Un árbol del bosque (ilustrativo)',
    alt: 'Diagrama de un árbol de decisión truncado a profundidad 3: la primera división es por grupo de edad y luego por sexo, departamento, tipo de vehículo, jornada y tipo de evento.',
    pie: `Uno de los ${ARBOLES} árboles, cortado a profundidad 3. La predicción promedia todos: uno solo no explica el modelo.`,
  },
]

export const SECCIONES = [
  { numero: '01', id: 'datos', etiqueta: 'Datos' },
  { numero: '02', id: 'modelo', etiqueta: 'Modelo' },
  { numero: '03', id: 'explicabilidad', etiqueta: 'Explicabilidad' },
  { numero: '04', id: 'uso-responsable', etiqueta: 'Uso responsable' },
  { numero: '05', id: 'codigo', etiqueta: 'Código' },
] as const
