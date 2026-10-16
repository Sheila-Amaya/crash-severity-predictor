import { describe, expect, it } from 'vitest'

import { construirQuery, urlBaseApi } from './client'

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

describe('urlBaseApi', () => {
  it('en desarrollo usa el mismo origen (proxy de Vite)', () => {
    expect(urlBaseApi(true, 'https://api.ejemplo.org')).toBe('')
  })

  it('en producción usa VITE_API_URL sin barra final', () => {
    expect(urlBaseApi(false, 'https://api.ejemplo.org/')).toBe('https://api.ejemplo.org')
    expect(urlBaseApi(false, ' http://localhost:8010 ')).toBe('http://localhost:8010')
  })

  it('sin VITE_API_URL en producción, mismo origen', () => {
    expect(urlBaseApi(false, undefined)).toBe('')
    expect(urlBaseApi(false, '')).toBe('')
  })
})
