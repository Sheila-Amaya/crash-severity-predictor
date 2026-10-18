import { describe, expect, it } from 'vitest'

import palette from './palette.json'
import { temaInicial } from './tema'

describe('temaInicial', () => {
  it('la elección guardada manda sobre el sistema', () => {
    expect(temaInicial('light', false)).toBe('light')
    expect(temaInicial('dark', true)).toBe('dark')
  })

  it('sin elección previa respeta prefers-color-scheme', () => {
    expect(temaInicial(null, true)).toBe('light')
    expect(temaInicial(null, false)).toBe('dark')
  })

  it('ignora valores guardados que no son un tema', () => {
    expect(temaInicial('azul', true)).toBe('light')
    expect(temaInicial('', false)).toBe('dark')
  })
})

describe('palette.json', () => {
  it('ambos temas definen las mismas claves', () => {
    expect(Object.keys(palette.light).sort()).toEqual(Object.keys(palette.dark).sort())
    expect(palette.light.mapScale).toHaveLength(palette.dark.mapScale.length)
  })
})
