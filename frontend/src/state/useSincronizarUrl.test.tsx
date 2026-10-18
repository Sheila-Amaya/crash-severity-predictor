import { StrictMode, type ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { useFiltros } from './filtros'
import { useSincronizarUrl } from './useSincronizarUrl'

function render(url: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <StrictMode>
      <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
    </StrictMode>
  )

  return renderHook(
    () => {
      useSincronizarUrl()
      return useLocation()
    },
    { wrapper },
  )
}

describe('useSincronizarUrl', () => {
  beforeEach(() => useFiltros.getState().limpiar())

  it('carga los filtros de un enlace compartido sin borrar la URL', () => {
    const { result } = render('/?anio=2023&depto=1&vista=mapa')

    expect(useFiltros.getState().filtros).toEqual({ anio: 2023, depto: 1 })
    expect(new URLSearchParams(result.current.search).get('anio')).toBe('2023')
    expect(new URLSearchParams(result.current.search).get('vista')).toBe('mapa')
  })

  it('escribe en la URL los cambios del store', () => {
    const { result } = render('/')

    act(() => useFiltros.getState().setFiltro('sexo', 2))

    expect(result.current.search).toBe('?sexo=2')
  })

  it('limpiar filtros deja la URL sin filtros y conserva otros parámetros', () => {
    const { result } = render('/?anio=2020&sexo=1&vista=mapa')

    act(() => useFiltros.getState().limpiar())

    expect(result.current.search).toBe('?vista=mapa')
    expect(useFiltros.getState().filtros).toEqual({})
  })
})
