import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { REPOSITORIO } from '../proyecto'
import { Layout } from './Layout'

describe('Layout', () => {
  afterEach(() => cleanup())

  it('el encabezado enlaza al repositorio en una pestaña nueva', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    )
    const enlace = screen.getByRole('link', { name: 'Código del proyecto en GitHub' })
    expect(enlace.getAttribute('href')).toBe(REPOSITORIO)
    expect(enlace.getAttribute('target')).toBe('_blank')
    expect(enlace.getAttribute('rel')).toBe('noopener noreferrer')
  })
})
