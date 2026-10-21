import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { cloneElement, type ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Serie } from '../../api/types'
import { SerieTemporal } from './SerieTemporal'

// Cifras de ejemplo para la prueba (no son datos del INE)
const SERIE: Serie = {
  agrupar: 'jornada',
  nota: null,
  datos: [
    { clave: 1, etiqueta: 'Mañana', hechos: 100, victimas: 120, fallecidos: 30, lesionados: 90, letalidad: 25 },
    { clave: 2, etiqueta: 'Tarde', hechos: 120, victimas: 190, fallecidos: 40, lesionados: 150, letalidad: 21.1 },
    { clave: 3, etiqueta: 'Noche', hechos: 90, victimas: 150, fallecidos: 50, lesionados: 100, letalidad: 33.3 },
    { clave: 4, etiqueta: 'Ignorada', hechos: 1500, victimas: 1400, fallecidos: 600, lesionados: 800, letalidad: 42.9 },
  ],
}

vi.mock('../../api/queries', () => ({
  useSerie: () => ({ data: SERIE, isPending: false, isError: false, refetch: vi.fn(), isFetching: false }),
}))

// jsdom no mide ni tiene ResizeObserver: tamaño fijo para que Recharts dibuje los ejes
vi.mock('recharts', async (original) => ({
  ...(await original<typeof import('recharts')>()),
  ResponsiveContainer: ({ children }: { children: ReactElement<{ width?: number; height?: number }> }) =>
    cloneElement(children, { width: 320, height: 192 }),
}))

function montarPorJornada() {
  const resultado = render(<SerieTemporal />)
  fireEvent.click(screen.getByRole('radio', { name: 'Jornada' }))
  return resultado
}

const textosEje = (contenedor: HTMLElement, clase: string) =>
  [...contenedor.querySelectorAll(`.${clase} .recharts-cartesian-axis-tick-value`)].map((t) => t.textContent ?? '')

describe('SerieTemporal con una categoría ignorada', () => {
  afterEach(cleanup)

  it('la gráfica omite "Ignorada" y recalcula el eje de letalidad', () => {
    const { container } = montarPorJornada()
    expect(textosEje(container, 'recharts-xAxis')).toEqual(['Mañana', 'Tarde', 'Noche'])
    const letalidad = textosEje(container, 'recharts-yAxis').filter((t) => t.endsWith('%')).map((t) => parseFloat(t))
    expect(letalidad.length).toBeGreaterThan(0)
    expect(Math.max(...letalidad)).toBeLessThan(42.9)
  })

  it('la gráfica avisa cuántas víctimas omite', () => {
    montarPorJornada()
    expect(screen.getByText('Se omiten 1,400 víctimas con jornada ignorada.')).toBeTruthy()
  })

  it('la tabla conserva la fila "Ignorada" y no muestra la nota', () => {
    montarPorJornada()
    fireEvent.click(screen.getByRole('button', { name: 'Tabla' }))
    const fila = screen.getByRole('rowheader', { name: 'Ignorada' }).closest('tr')
    expect(fila?.textContent).toContain('600')
    expect(fila?.textContent).toContain('800')
    expect(screen.queryByText(/Se omiten/)).toBeNull()
  })
})
