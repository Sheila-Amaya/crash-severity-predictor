import type {
  AccidenteInput,
  Agrupacion,
  Catalogos,
  Coropletico,
  ErrorValidacion,
  Filtros,
  Nivel,
  OpcionesPrediccion,
  OrdenRanking,
  Prediccion,
  Ranking,
  Resumen,
  Serie,
} from './types'
import { FILTRO_KEYS } from './types'

/**
 * Origen de la API.
 * - Desarrollo: '' (mismo origen); el proxy de Vite reenvía /api a
 *   VITE_API_URL (por defecto http://localhost:8000), sin CORS.
 * - Producción: VITE_API_URL, fijada al compilar (p. ej. https://api.ejemplo.org).
 *   Vacía = mismo origen, para servir la API detrás del mismo dominio.
 */
export function urlBaseApi(desarrollo: boolean, url: string | undefined): string {
  if (desarrollo) return ''
  return (url ?? '').trim().replace(/\/+$/, '')
}

const BASE_URL = urlBaseApi(import.meta.env.DEV, import.meta.env.VITE_API_URL)

export class ApiError extends Error {
  readonly status: number
  readonly errores: ErrorValidacion[]

  constructor(status: number, message: string, errores: ErrorValidacion[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errores = errores
  }
}

type Params = Record<string, string | number | undefined | null>

/** Query string con los filtros definidos (en orden estable) y parámetros extra. */
export function construirQuery(filtros: Filtros, extra: Params = {}): string {
  const params = new URLSearchParams()

  for (const key of FILTRO_KEYS) {
    const valor = filtros[key]
    if (valor !== undefined && valor !== null) params.set(key, String(valor))
  }

  for (const [key, valor] of Object.entries(extra)) {
    if (valor !== undefined && valor !== null) params.set(key, String(valor))
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...init?.headers },
    })
  } catch {
    throw new ApiError(0, 'No se pudo conectar con la API.')
  }

  if (!response.ok) {
    let message = `Error ${response.status}`
    let errores: ErrorValidacion[] = []

    try {
      const body = await response.json()
      if (typeof body?.message === 'string') message = body.message
      if (Array.isArray(body?.errors)) errores = body.errors
    } catch {
      // cuerpo no JSON: se conserva el mensaje genérico
    }

    throw new ApiError(response.status, message, errores)
  }

  return response.json() as Promise<T>
}

export const api = {
  catalogos: () => request<Catalogos>('/api/catalogos'),

  resumen: (filtros: Filtros) => request<Resumen>(`/api/resumen${construirQuery(filtros)}`),

  serie: (filtros: Filtros, agrupar: Agrupacion) =>
    request<Serie>(`/api/estadisticas/serie${construirQuery(filtros, { agrupar })}`),

  ranking: (filtros: Filtros, nivel: Nivel, orden: OrdenRanking, limite = 10) =>
    request<Ranking>(
      `/api/estadisticas/ranking${construirQuery(filtros, { nivel, orden, limite })}`,
    ),

  coropletico: (filtros: Filtros, nivel: Nivel) =>
    request<Coropletico>(`/api/mapa/coropletico${construirQuery(filtros, { nivel })}`),

  opcionesPrediccion: () => request<OpcionesPrediccion>('/api/predecir/opciones'),

  predecir: (input: AccidenteInput) =>
    request<Prediccion>('/api/predecir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),
}
