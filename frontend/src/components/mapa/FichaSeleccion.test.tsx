import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PropiedadesMapa } from '../../utils/clasificacion'
import { FichaSeleccion } from './FichaSeleccion'

// Cifras de ejemplo para la prueba (no son datos del INE)
const GUATEMALA: PropiedadesMapa = {
  codigo: 1,
  nombre: 'Guatemala',
  depto: 1,
  hechos: 1000,
  total: 1200,
  fallecidos: 150,
  lesionados: 1050,
  letalidad: 12.5,
  clase: 1,
  color: '#000000',
  etiquetaClase: 'Q1 · letalidad baja',
}

function montar(nivel: 'depto' | 'municipio' = 'depto') {
  const onCerrar = vi.fn()
  const onBajarNivel = vi.fn()
  render(
    <div>
      <button type="button">Otro control</button>
      <FichaSeleccion props={GUATEMALA} nivel={nivel} onCerrar={onCerrar} onBajarNivel={onBajarNivel} />
    </div>,
  )
  return { onCerrar, onBajarNivel }
}

describe('FichaSeleccion (toque en una burbuja o área)', () => {
  afterEach(cleanup)

  it('muestra el nombre y las cifras del área tocada', () => {
    montar()
    const ficha = screen.getByRole('region', { name: 'Datos de Guatemala' })
    expect(ficha.textContent).toContain('Guatemala')
    expect(ficha.textContent).toContain('1,200')
    expect(ficha.textContent).toContain('150')
    expect(ficha.textContent).toContain('1,050')
    expect(ficha.textContent).toContain('Q1 · letalidad baja')
  })

  it('"Ver municipios" baja de nivel; en un municipio ofrece verlo solo', () => {
    const { onBajarNivel } = montar('depto')
    fireEvent.click(screen.getByRole('button', { name: 'Ver municipios' }))
    expect(onBajarNivel).toHaveBeenCalledTimes(1)
    cleanup()
    montar('municipio')
    expect(screen.getByRole('button', { name: 'Ver solo este municipio' })).toBeTruthy()
  })

  it('se cierra con ✕ (zona táctil de 44 px), con Esc y tocando fuera', () => {
    const { onCerrar } = montar()
    const cerrar = screen.getByRole('button', { name: 'Cerrar los datos de Guatemala' })
    expect(cerrar.className).toContain('h-11')
    expect(cerrar.className).toContain('w-11')
    fireEvent.click(cerrar)
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Otro control' }))
    expect(onCerrar).toHaveBeenCalledTimes(3)
  })

  it('tocar dentro de la ficha no la cierra', () => {
    const { onCerrar } = montar()
    fireEvent.pointerDown(screen.getByText('Víctimas'))
    expect(onCerrar).not.toHaveBeenCalled()
  })
})
