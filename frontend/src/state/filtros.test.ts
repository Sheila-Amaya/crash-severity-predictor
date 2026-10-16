import { beforeEach, describe, expect, it } from 'vitest'

import type { Catalogos } from '../api/types'
import {
  aplicarFiltro,
  contarFiltros,
  filtrosDesdeParams,
  paramsConFiltros,
  sanearFiltros,
  tieneFiltrosVictima,
  useFiltros,
} from './filtros'

const opciones = (...ids: number[]) => ids.map((id) => ({ id, descripcion: String(id) }))

const CATALOGOS: Catalogos = {
  anio: opciones(2018, 2023),
  depto: opciones(1, 2),
  municipio: [
    { id: 101, descripcion: 'Guatemala', depto: 1 },
    { id: 201, descripcion: 'Guastatoya', depto: 2 },
  ],
  g_hora_5: opciones(1, 2, 3, 4),
  dia_sem_ocu: opciones(1, 7),
  tipo_eve: opciones(1, 99),
  tipo_veh: opciones(4, 18, 99),
  sexo: opciones(1, 2, 9),
  edad_quinquenales: opciones(1, 18),
}

describe('aplicarFiltro', () => {
  it('agrega y quita filtros', () => {
    expect(aplicarFiltro({}, 'anio', 2023)).toEqual({ anio: 2023 })
    expect(aplicarFiltro({ anio: 2023 }, 'anio', undefined)).toEqual({})
  })

  it('elegir un municipio fija su departamento', () => {
    expect(aplicarFiltro({}, 'municipio', 1203)).toEqual({ municipio: 1203, depto: 12 })
  })

  it('cambiar de departamento quita un municipio ajeno', () => {
    expect(aplicarFiltro({ depto: 1, municipio: 101 }, 'depto', 2)).toEqual({ depto: 2 })
  })

  it('quitar el departamento quita el municipio', () => {
    expect(aplicarFiltro({ depto: 1, municipio: 101, sexo: 2 }, 'depto', undefined)).toEqual({
      sexo: 2,
    })
  })

  it('no modifica el objeto original', () => {
    const original = { anio: 2020 }
    aplicarFiltro(original, 'sexo', 1)
    expect(original).toEqual({ anio: 2020 })
  })
})

describe('URL', () => {
  it('lee solo filtros conocidos con valores numéricos', () => {
    const params = new URLSearchParams('anio=2023&depto=abc&sexo=2&vista=mapa&municipio=-1')
    expect(filtrosDesdeParams(params)).toEqual({ anio: 2023, sexo: 2 })
  })

  it('escribe filtros y conserva otros parámetros', () => {
    const params = new URLSearchParams('vista=mapa&anio=2019')
    const resultado = paramsConFiltros(params, { depto: 5, sexo: 1 })

    expect(resultado.get('vista')).toBe('mapa')
    expect(resultado.get('anio')).toBeNull()
    expect(resultado.get('depto')).toBe('5')
    expect(resultado.get('sexo')).toBe('1')
  })

  it('ida y vuelta conserva los filtros', () => {
    const filtros = { anio: 2023, depto: 1, municipio: 101, tipo_veh: 18 }
    expect(filtrosDesdeParams(paramsConFiltros(new URLSearchParams(), filtros))).toEqual(filtros)
  })
})

describe('sanearFiltros', () => {
  it('quita códigos inexistentes', () => {
    expect(sanearFiltros({ anio: 1999, depto: 1, sexo: 5 }, CATALOGOS)).toEqual({ depto: 1 })
  })

  it('quita un municipio fuera del departamento', () => {
    expect(sanearFiltros({ depto: 2, municipio: 101 }, CATALOGOS)).toEqual({ depto: 2 })
  })

  it('conserva códigos "Ignorado" válidos para filtrar', () => {
    expect(sanearFiltros({ tipo_eve: 99, sexo: 9 }, CATALOGOS)).toEqual({ tipo_eve: 99, sexo: 9 })
  })
})

describe('utilidades', () => {
  it('cuenta filtros y detecta filtros de víctima', () => {
    expect(contarFiltros({ anio: 2023, sexo: 1 })).toBe(2)
    expect(tieneFiltrosVictima({ anio: 2023 })).toBe(false)
    expect(tieneFiltrosVictima({ edad_quinquenales: 5 })).toBe(true)
  })
})

describe('store useFiltros', () => {
  beforeEach(() => useFiltros.getState().limpiar())

  it('setFiltro aplica la cascada y limpiar vacía todo', () => {
    const { setFiltro } = useFiltros.getState()

    setFiltro('municipio', 101)
    expect(useFiltros.getState().filtros).toEqual({ municipio: 101, depto: 1 })

    setFiltro('depto', 2)
    expect(useFiltros.getState().filtros).toEqual({ depto: 2 })

    useFiltros.getState().limpiar()
    expect(useFiltros.getState().filtros).toEqual({})
  })
})
