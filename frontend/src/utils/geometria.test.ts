import { describe, expect, it } from 'vitest'

import { cajaEnvolvente, centroide, puntoEnPoligono, radioBurbuja } from './geometria'

const cuadrado = (x: number, y: number, lado: number) => [
  [
    [x, y],
    [x + lado, y],
    [x + lado, y + lado],
    [x, y + lado],
    [x, y],
  ],
]

describe('centroide', () => {
  it('centro de un cuadrado', () => {
    expect(centroide({ type: 'Polygon', coordinates: cuadrado(0, 0, 2) })).toEqual([1, 1])
  })

  it('usa el polígono de mayor área en un MultiPolygon', () => {
    const c = centroide({ type: 'MultiPolygon', coordinates: [cuadrado(10, 10, 1), cuadrado(0, 0, 4)] })
    expect(c).toEqual([2, 2])
  })

  it('en una forma de "U" el punto queda dentro del polígono', () => {
    const u = [
      [
        [0, 0],
        [3, 0],
        [3, 3],
        [2, 3],
        [2, 1],
        [1, 1],
        [1, 3],
        [0, 3],
        [0, 0],
      ],
    ]
    const c = centroide({ type: 'Polygon', coordinates: u })!
    expect(puntoEnPoligono(c, u)).toBe(true)
  })

  it('devuelve null para geometrías sin área', () => {
    expect(centroide({ type: 'Point', coordinates: [1, 2] })).toBeNull()
  })
})

describe('utilidades', () => {
  it('caja envolvente', () => {
    expect(
      cajaEnvolvente({ features: [{ geometry: { type: 'Polygon', coordinates: cuadrado(-91, 14, 1) } }] }),
    ).toEqual([-91, 14, -90, 15])
  })

  it('radio proporcional a la raíz cuadrada', () => {
    expect(radioBurbuja(0, 100)).toBe(0)
    expect(radioBurbuja(100, 100)).toBe(36)
    // Un cuarto del valor -> la mitad del tramo variable
    expect(radioBurbuja(25, 100)).toBe(21)
  })
})
