import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { HojaInferior } from './HojaInferior'

function montar(abierta = true) {
  const onCerrar = vi.fn()
  const vista = render(
    <HojaInferior titulo="Datos" abierta={abierta} onCerrar={onCerrar}>
      <p>Contenido de la hoja</p>
    </HojaInferior>,
  )
  return { onCerrar, ...vista }
}

describe('HojaInferior', () => {
  afterEach(cleanup)

  it('cerrada no muestra nada', () => {
    montar(false)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('abierta es un diálogo modal con su título y contenido, y enfoca Cerrar', () => {
    montar()
    const dialogo = screen.getByRole('dialog', { name: 'Datos' })
    expect(dialogo.getAttribute('aria-modal')).toBe('true')
    expect(screen.getByText('Contenido de la hoja')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Cerrar/ }))
  })

  it('el botón Cerrar tiene una zona táctil de al menos 44 px', () => {
    montar()
    const cerrar = screen.getByRole('button', { name: /Cerrar/ })
    expect(cerrar.className).toContain('min-h-11')
    expect(cerrar.className).toContain('min-w-11')
  })

  it('se cierra con el botón, con Esc y tocando el fondo', () => {
    const { onCerrar, container } = montar()
    fireEvent.click(screen.getByRole('button', { name: /Cerrar/ }))
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(container.ownerDocument.querySelector('[role="dialog"] > [aria-hidden="true"]')!)
    expect(onCerrar).toHaveBeenCalledTimes(3)
  })
})
