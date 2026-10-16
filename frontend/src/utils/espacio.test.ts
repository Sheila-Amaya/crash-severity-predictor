import { describe, expect, it } from 'vitest'

import { etiquetasVisibles, margenesLibres } from './espacio'

const caja = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom })
const CONTENEDOR = caja(0, 0, 1440, 844)

describe('margenesLibres', () => {
  it('sin paneles deja la separación base', () => {
    expect(margenesLibres(CONTENEDOR, [])).toEqual({ top: 16, right: 16, bottom: 16, left: 16 })
  })

  it('deja libre el espacio de cada panel según su lado', () => {
    const m = margenesLibres(CONTENEDOR, [
      { lado: 'izquierda', caja: caja(16, 80, 216, 500) },
      { lado: 'derecha', caja: caja(1080, 16, 1424, 600) },
      { lado: 'arriba', caja: caja(500, 16, 940, 64) },
      { lado: 'abajo', caja: caja(16, 760, 400, 828) },
    ])
    expect(m).toEqual({ left: 232, right: 376, top: 80, bottom: 100 })
  })

  it('un panel lateral plegado a su cabecera cuenta como superior', () => {
    const m = margenesLibres(CONTENEDOR, [{ lado: 'derecha', caja: caja(1080, 16, 1424, 52) }])
    expect(m).toEqual({ top: 68, right: 16, bottom: 16, left: 16 })
  })

  it('ignora paneles ocultos', () => {
    expect(margenesLibres(CONTENEDOR, [{ lado: 'derecha', caja: caja(0, 0, 0, 0) }]).right).toBe(16)
  })

  it('reduce los márgenes si dejarían el mapa demasiado estrecho', () => {
    const m = margenesLibres(caja(0, 0, 400, 800), [
      { lado: 'izquierda', caja: caja(0, 0, 300, 600) },
      { lado: 'derecha', caja: caja(100, 0, 400, 600) },
    ])
    expect(m.left + m.right).toBeCloseTo(400 * 0.65)
  })
})

describe('etiquetasVisibles', () => {
  it('oculta etiquetas que chocan con una burbuja ajena', () => {
    const visibles = etiquetasVisibles(
      [
        { ...caja(0, 0, 40, 10), propia: 0 },
        { ...caja(100, 100, 140, 110), propia: 1 },
      ],
      [
        { x: 20, y: 30, r: 10 },
        { x: 120, y: 105, r: 15 },
        { x: 20, y: 5, r: 4 },
      ],
    )
    expect(visibles).toEqual([false, true])
  })

  it('la burbuja propia no oculta su etiqueta', () => {
    expect(etiquetasVisibles([{ ...caja(0, 0, 40, 10), propia: 0 }], [{ x: 20, y: 5, r: 8 }])).toEqual([true])
  })

  it('oculta etiquetas que quedan bajo un panel', () => {
    expect(etiquetasVisibles([caja(10, 10, 50, 20), caja(300, 10, 340, 20)], [], [caja(0, 0, 200, 400)])).toEqual([
      false,
      true,
    ])
  })

  it('entre etiquetas que se solapan, gana la primera', () => {
    expect(etiquetasVisibles([caja(0, 0, 50, 10), caja(30, 5, 80, 15), caja(100, 0, 150, 10)], [])).toEqual([
      true,
      false,
      true,
    ])
  })
})
