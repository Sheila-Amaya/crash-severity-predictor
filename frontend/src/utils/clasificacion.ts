import type { Coropletico, PropiedadesTerritorio } from '../api/types'

export type Metrica = 'letalidad' | 'total'

export interface Clase {
  /** 1 = más bajo. */
  indice: number
  color: string
  min: number
  max: number
  etiqueta: string
  cantidad: number
}

export interface PropiedadesMapa extends PropiedadesTerritorio {
  /** 0 = sin víctimas. */
  clase: number
  color: string
  etiquetaClase: string
}

export interface Clasificacion {
  coleccion: GeoJSON.FeatureCollection<GeoJSON.Geometry, PropiedadesMapa>
  clases: Clase[]
  sinVictimas: number
}

/** Valor de la métrica; null cuando el territorio no tiene víctimas. */
export function valorMetrica(p: PropiedadesTerritorio, metrica: Metrica): number | null {
  if (p.total === 0) return null
  return metrica === 'total' ? p.total : p.letalidad
}

/**
 * Umbrales de quintil por rango más cercano sobre los valores visibles,
 * sin duplicados (con empates puede haber menos de 4).
 */
export function umbralesQuintil(valores: number[]): number[] {
  if (valores.length === 0) return []
  const ordenados = [...valores].sort((a, b) => a - b)
  const n = ordenados.length
  const umbrales = [1, 2, 3, 4].map((q) => ordenados[Math.max(0, Math.ceil((q * n) / 5) - 1)])
  return [...new Set(umbrales)]
}

/** Índice de color (0–4) para la clase i de k, repartido sobre la escala de 5. */
const indiceColor = (i: number, k: number) => (k === 1 ? 4 : Math.round(((i - 1) * 4) / (k - 1)))

export function etiquetaClase(i: number, k: number): string {
  const extremo = k > 1 ? (i === k ? ' (más alto)' : i === 1 ? ' (más bajo)' : '') : ''
  return k === 5 ? `Quintil ${i} de 5${extremo}` : `Grupo ${i} de ${k}${extremo}`
}

/**
 * Clasifica los territorios en quintiles relativos de la métrica elegida.
 * Los cortes se calculan solo con los datos visibles. Los territorios sin
 * víctimas quedan en la clase 0 ("Sin víctimas"), nunca en la más baja.
 */
export function clasificar(datos: Coropletico, metrica: Metrica, escala: string[], colorNulo: string): Clasificacion {
  const valores = datos.features
    .map((f) => valorMetrica(f.properties, metrica))
    .filter((v): v is number => v !== null)

  const umbrales = umbralesQuintil(valores)
  const claseBruta = (v: number) => {
    const i = umbrales.findIndex((u) => v <= u)
    return i === -1 ? umbrales.length + 1 : i + 1
  }

  // Se descartan clases vacías (p. ej. cuando el máximo coincide con un umbral)
  const usadas = [...new Set(valores.map(claseBruta))].sort((a, b) => a - b)
  const k = usadas.length
  const renumerar = new Map(usadas.map((bruta, i) => [bruta, i + 1]))

  const clases: Clase[] = usadas.map((_, i) => ({
    indice: i + 1,
    color: escala[indiceColor(i + 1, k)],
    min: Infinity,
    max: -Infinity,
    etiqueta: etiquetaClase(i + 1, k),
    cantidad: 0,
  }))

  let sinVictimas = 0

  const features = datos.features.map((f) => {
    const valor = valorMetrica(f.properties, metrica)
    let clase = 0

    if (valor === null) {
      sinVictimas++
    } else {
      clase = renumerar.get(claseBruta(valor))!
      const c = clases[clase - 1]
      c.min = Math.min(c.min, valor)
      c.max = Math.max(c.max, valor)
      c.cantidad++
    }

    const properties: PropiedadesMapa = {
      ...f.properties,
      clase,
      color: clase === 0 ? colorNulo : clases[clase - 1].color,
      etiquetaClase: clase === 0 ? 'Sin víctimas' : clases[clase - 1].etiqueta,
    }

    return { type: 'Feature' as const, geometry: f.geometry, properties }
  })

  return { coleccion: { type: 'FeatureCollection', features }, clases, sinVictimas }
}
