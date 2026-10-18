import { describe, expect, it } from 'vitest'

import { LOGO, svgFavicon } from './logo'
import palette from './palette.json'

describe('logotipo', () => {
  it('el anillo exterior cabe en el viewBox', () => {
    const exterior = LOGO.anillos[LOGO.anillos.length - 1]
    expect(exterior.r + exterior.grosor).toBeLessThanOrEqual(LOGO.vista / 2)
  })

  it('el favicon usa los colores de la paleta en ambos temas', () => {
    const svg = svgFavicon()
    expect(svg).toContain(palette.dark.accent)
    expect(svg).toContain(palette.light.accent)
    expect(svg).toContain('prefers-color-scheme: light')
    // Punto y dos anillos
    expect(svg.match(/<circle/g)).toHaveLength(LOGO.anillos.length + 1)
  })
})
