// Tipos de la API (core/schemas/*). Mantener alineado con /openapi.json.

// -- Filtros ------------------------------------------------------------

export const FILTROS_EVENTO = [
  'anio',
  'depto',
  'municipio',
  'g_hora_5',
  'dia_sem_ocu',
  'tipo_eve',
] as const

export const FILTROS_VICTIMA = ['tipo_veh', 'sexo', 'edad_quinquenales'] as const

export const FILTRO_KEYS = [...FILTROS_EVENTO, ...FILTROS_VICTIMA] as const

export type FiltroKey = (typeof FILTRO_KEYS)[number]

export type Filtros = Partial<Record<FiltroKey, number>>

// -- /api/catalogos -------------------------------------------------------

export interface Opcion {
  id: number
  descripcion: string
}

export interface MunicipioOpcion extends Opcion {
  depto: number
}

export interface Catalogos {
  anio: Opcion[]
  depto: Opcion[]
  municipio: MunicipioOpcion[]
  g_hora_5: Opcion[]
  dia_sem_ocu: Opcion[]
  tipo_eve: Opcion[]
  tipo_veh: Opcion[]
  sexo: Opcion[]
  edad_quinquenales: Opcion[]
}

// -- Estadísticas ---------------------------------------------------------

export interface FilaEstadistica {
  hechos: number | null
  victimas: number
  fallecidos: number
  lesionados: number
  letalidad: number | null
}

export interface Resumen extends FilaEstadistica {
  nota: string | null
}

export type Agrupacion = 'anio' | 'mes' | 'dia_sem' | 'jornada'

export interface PuntoSerie extends FilaEstadistica {
  clave: number
  etiqueta: string
}

export interface Serie {
  agrupar: Agrupacion
  datos: PuntoSerie[]
  nota: string | null
}

export type Nivel = 'depto' | 'municipio'

export type OrdenRanking = 'fallecidos' | 'victimas' | 'letalidad'

export interface FilaRanking extends FilaEstadistica {
  posicion: number
  codigo: number
  nombre: string
  depto: number | null
}

export interface Ranking {
  nivel: Nivel
  orden: OrdenRanking
  limite: number
  datos: FilaRanking[]
  nota: string | null
}

// -- /api/mapa/coropletico ------------------------------------------------

export interface PropiedadesTerritorio {
  codigo: number
  nombre: string
  depto: number | null
  hechos: number | null
  total: number
  fallecidos: number
  lesionados: number
  letalidad: number | null
}

export interface FeatureTerritorio {
  type: 'Feature'
  geometry: GeoJSON.Geometry
  properties: PropiedadesTerritorio
}

export interface Coropletico {
  type: 'FeatureCollection'
  nivel: Nivel
  nota: string | null
  features: FeatureTerritorio[]
}

// -- Predicción -----------------------------------------------------------

export const VARIABLES_MODELO = [
  'tipo_eve',
  'tipo_veh',
  'g_hora_5',
  'dia_sem_ocu',
  'sexo_per',
  'edad_quinquenales',
  'mayor_menor',
  'depto_ocu',
] as const

export type VariableModelo = (typeof VARIABLES_MODELO)[number]

export type AccidenteInput = Record<VariableModelo, number>

export type OpcionesPrediccion = Record<VariableModelo, Opcion[]> & {
  nota: string
}

export interface Factor {
  variable: VariableModelo
  etiqueta: string
  valor: number
  contribucion: number
  efecto: 'aumenta' | 'disminuye'
}

export interface Prediccion {
  resultado: 'Fallecido' | 'Lesionado'
  clase: 1 | 2
  /** Probabilidad (%) de la clase predicha; en la interfaz: "probabilidad estimada". */
  confianza: number
  probabilidades: { Fallecido: number; Lesionado: number }
  factores: Factor[]
}

// -- Errores --------------------------------------------------------------

export interface ErrorValidacion {
  loc: (string | number)[]
  msg: string
  type: string
}
