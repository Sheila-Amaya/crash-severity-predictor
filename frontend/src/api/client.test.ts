import { describe, expect, it } from 'vitest'

import { construirQuery } from './client'

describe('construirQuery', () => {
  it('omite filtros vacíos', () => {
    expect(construirQuery({})).toBe('')
  })

  it('serializa filtros en orden estable y agrega parámetros extra', () => {
    expect(construirQuery({ sexo: 2, anio: 2023 }, { nivel: 'depto' })).toBe(
      '?anio=2023&sexo=2&nivel=depto',
    )
  })

  it('ignora extras nulos o indefinidos', () => {
    expect(construirQuery({ depto: 1 }, { orden: undefined, limite: null })).toBe('?depto=1')
  })
})
