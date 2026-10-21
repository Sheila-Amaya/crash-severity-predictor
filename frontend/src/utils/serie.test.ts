import { describe, expect, it } from 'vitest'

import type { PuntoSerie } from '../api/types'
import { esSinDato, notaOmitidos, separarSinDato } from './serie'

// Cifras de ejemplo para la prueba (no son datos del INE)
const punto = (clave: number, etiqueta: string, fallecidos: number, lesionados: number): PuntoSerie => ({
  clave,
  etiqueta,
  hechos: null,
  victimas: fallecidos + lesionados,
  fallecidos,
  lesionados,
  letalidad: fallecidos + lesionados ? (100 * fallecidos) / (fallecidos + lesionados) : null,
})

const JORNADA = [
  punto(1, 'Mañana', 3000, 9000),
  punto(2, 'Tarde', 4000, 15000),
  punto(3, 'Noche', 5000, 10000),
  punto(4, 'Ignorada', 600, 800),
]

describe('esSinDato', () => {
  it('reconoce las etiquetas de catálogo sin dato', () => {
    expect(esSinDato({ etiqueta: 'Ignorada' })).toBe(true)
    expect(esSinDato({ etiqueta: 'Ignorado' })).toBe(true)
    expect(esSinDato({ etiqueta: ' sin dato ' })).toBe(true)
    expect(esSinDato({ etiqueta: 'Noche' })).toBe(false)
    expect(esSinDato({ etiqueta: '2024' })).toBe(false)
  })
})

describe('separarSinDato', () => {
  it('quita "Ignorada" de lo visible sin perder filas', () => {
    const { visibles, omitidos } = separarSinDato(JORNADA)
    expect(visibles.map((d) => d.etiqueta)).toEqual(['Mañana', 'Tarde', 'Noche'])
    expect(omitidos.map((d) => d.etiqueta)).toEqual(['Ignorada'])
  })

  it('sin categorías sin dato deja todo visible', () => {
    const anios = [punto(2023, '2023', 10, 90), punto(2024, '2024', 12, 88)]
    expect(separarSinDato(anios)).toEqual({ visibles: anios, omitidos: [] })
  })
})

describe('notaOmitidos', () => {
  it('cuenta las víctimas omitidas con separador de miles', () => {
    const { omitidos } = separarSinDato(JORNADA)
    expect(notaOmitidos(omitidos, 'jornada')).toBe('Se omiten 1,400 víctimas con jornada ignorada.')
  })

  it('usa singular con una sola víctima', () => {
    expect(notaOmitidos([punto(4, 'Ignorada', 1, 0)], 'jornada')).toBe('Se omite 1 víctima con jornada ignorada.')
  })

  it('no muestra nota si no se omitió nada o la categoría no tiene víctimas', () => {
    expect(notaOmitidos([], 'jornada')).toBeNull()
    expect(notaOmitidos([punto(4, 'Ignorada', 0, 0)], 'jornada')).toBeNull()
  })
})
