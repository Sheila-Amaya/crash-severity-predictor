import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useMapaUi } from '../../state/mapaUi'
import { Leyenda } from './Leyenda'

function montar() {
  // Sin datos del mapa: basta para el texto de la vista
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('{}', { status: 404 }))))
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const envoltorio = ({ children }: { children: ReactNode }) => <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  return render(<Leyenda />, { wrapper: envoltorio })
}

describe('Leyenda', () => {
  beforeEach(() => vi.unstubAllGlobals())
  afterEach(() => {
    cleanup()
    act(() => useMapaUi.getState().setVista('burbujas'))
  })

  it('en 3D explica que la altura es una escala suavizada, no proporcional', () => {
    act(() => useMapaUi.getState().setVista('3d'))
    const { container } = montar()
    expect(screen.getByText('Altura: víctimas (escala suavizada)')).toBeTruthy()
    expect(screen.getByText(/la altura no es proporcional/)).toBeTruthy()
    expect(screen.getByText(/Para cifras exactas, usa el ranking\./)).toBeTruthy()
    expect(container.textContent).not.toMatch(/raíz cuadrada/i)
  })

  it('fuera de 3D no muestra la explicación de la altura', () => {
    montar()
    expect(screen.queryByText(/escala suavizada/)).toBeNull()
  })
})
