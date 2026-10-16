import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Acerca } from './Acerca'

describe('Acerca', () => {
  it('muestra las secciones y la Tabla I', () => {
    render(<Acerca />)
    expect(screen.getByRole('heading', { level: 1, name: 'Un mapa de severidad vial, abierto y explicable.' })).toBeTruthy()

    const tabla = screen.getByRole('table', { name: /Tabla I/ })
    for (const valor of ['0.6949', '0.7233', '0.7336', '0.6245', '0.3382']) {
      expect(within(tabla).getByText(valor)).toBeTruthy()
    }
    expect(screen.getByRole('list', { name: 'Flujo del sistema' }).textContent).toContain('Microdatos INE')
    expect(screen.getByText(/1 de cada 3 alertas «Fallecido» es real/)).toBeTruthy()
    // Sin URL del repositorio no hay pie
    expect(document.querySelector('footer')).toBeNull()
    expect(document.title).toBe('Acerca de · Severidad vial · Guatemala')
  })
})
