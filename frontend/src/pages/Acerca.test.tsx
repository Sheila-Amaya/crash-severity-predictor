import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { REPOSITORIO } from '../proyecto'
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
    // Pie con el enlace al repositorio (único enlace externo)
    const pie = document.querySelector('footer') as HTMLElement
    expect(pie.textContent).toBe('Código abierto en GitHub')
    const enlace = within(pie).getByRole('link', { name: 'GitHub' })
    expect(enlace.getAttribute('href')).toBe(REPOSITORIO)
    expect(enlace.getAttribute('target')).toBe('_blank')
    expect(enlace.getAttribute('rel')).toBe('noopener noreferrer')
    expect(document.title).toBe('Acerca de · Severidad vial · Guatemala')
  })
})
