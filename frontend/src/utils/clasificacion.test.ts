import { describe, expect, it } from 'vitest'

import type { Coropletico, FeatureTerritorio } from '../api/types'
import { clasificar, etiquetaClase, umbralesQuintil } from './clasificacion'

const ESCALA = ['#c1', '#c2', '#c3', '#c4', '#c5']
const NULO = '#nulo'

function territorio(codigo: number, total: number, fallecidos: number): FeatureTerritorio {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [codigo, -codigo] },
    properties: {
      codigo,
      nombre: `T${codigo}`,
      depto: null,
      hechos: null,
      total,
      fallecidos,
      lesionados: total - fallecidos,
      letalidad: total === 0 ? null : (fallecidos / total) * 100,
    },
  }
}

const coleccion = (features: FeatureTerritorio[]): Coropletico => ({
  type: 'FeatureCollection',
  nivel: 'depto',
  nota: null,
  features,
})

describe('umbralesQuintil', () => {
  it('reparte 10 valores en 5 grupos de 2', () => {
    expect(umbralesQuintil([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toEqual([2, 4, 6, 8])
  })

  it('elimina umbrales repetidos cuando hay empates', () => {
    expect(umbralesQuintil([5, 5, 5, 5, 9])).toEqual([5])
  })
})

describe('clasificar', () => {
  it('asigna quintiles por total y deja "sin víctimas" aparte', () => {
    const datos = coleccion([
      ...Array.from({ length: 10 }, (_, i) => territorio(i + 1, (i + 1) * 10, 1)),
      territorio(99, 0, 0),
    ])

    const r = clasificar(datos, 'total', ESCALA, NULO)

    expect(r.clases.map((c) => c.cantidad)).toEqual([2, 2, 2, 2, 2])
    expect(r.clases.map((c) => c.color)).toEqual(ESCALA)
    expect(r.clases[4]).toMatchObject({ min: 90, max: 100, etiqueta: 'Quintil 5 de 5 (más alto)' })
    expect(r.sinVictimas).toBe(1)

    const sin = r.coleccion.features.find((f) => f.properties.codigo === 99)!
    expect(sin.properties).toMatchObject({ clase: 0, color: NULO, etiquetaClase: 'Sin víctimas' })
  })

  it('un territorio sin víctimas nunca cae en la clase más baja', () => {
    const r = clasificar(coleccion([territorio(1, 0, 0), territorio(2, 5, 1)]), 'letalidad', ESCALA, NULO)
    expect(r.coleccion.features[0].properties.clase).toBe(0)
    expect(r.coleccion.features[1].properties.clase).toBe(1)
  })

  it('con menos valores distintos usa menos clases repartidas en la escala', () => {
    const r = clasificar(coleccion([territorio(1, 10, 1), territorio(2, 10, 1), territorio(3, 20, 1)]), 'total', ESCALA, NULO)

    expect(r.clases).toHaveLength(2)
    expect(r.clases.map((c) => c.color)).toEqual(['#c1', '#c5'])
    expect(r.clases[1].etiqueta).toBe('Grupo 2 de 2 (más alto)')
  })

  it('un solo territorio usa el color más alto', () => {
    const r = clasificar(coleccion([territorio(1, 10, 2)]), 'letalidad', ESCALA, NULO)
    expect(r.clases).toEqual([expect.objectContaining({ color: '#c5', min: 20, max: 20 })])
  })
})

describe('utilidades', () => {
  it('etiquetas de clase', () => {
    expect(etiquetaClase(1, 5)).toBe('Quintil 1 de 5 (más bajo)')
    expect(etiquetaClase(3, 5)).toBe('Quintil 3 de 5')
  })

})
