import type { Nivel } from '../api/types'

type Anillo = number[][]
type Poligono = Anillo[]

const poligonosDe = (geometria: GeoJSON.Geometry): Poligono[] =>
  geometria.type === 'Polygon'
    ? [geometria.coordinates]
    : geometria.type === 'MultiPolygon'
      ? geometria.coordinates
      : []

/** Área con signo (fórmula del polígono) de un anillo, en grados². */
function areaAnillo(anillo: Anillo): number {
  let suma = 0
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    suma += anillo[j][0] * anillo[i][1] - anillo[i][0] * anillo[j][1]
  }
  return suma / 2
}

/** Punto dentro de un polígono con huecos (ray casting). */
export function puntoEnPoligono([x, y]: number[], poligono: Poligono): boolean {
  let dentro = false
  for (const anillo of poligono) {
    for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
      const [xi, yi] = anillo[i]
      const [xj, yj] = anillo[j]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro
    }
  }
  return dentro
}

/** Centroide de área del anillo exterior. */
function centroideAnillo(anillo: Anillo): [number, number] {
  let cx = 0
  let cy = 0
  let a = 0
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const f = anillo[j][0] * anillo[i][1] - anillo[i][0] * anillo[j][1]
    cx += (anillo[j][0] + anillo[i][0]) * f
    cy += (anillo[j][1] + anillo[i][1]) * f
    a += f
  }
  if (a === 0) return [anillo[0][0], anillo[0][1]]
  return [cx / (3 * a), cy / (3 * a)]
}

/**
 * Punto representativo de un territorio para su burbuja/etiqueta: centroide
 * del polígono de mayor área. Si cae fuera (formas cóncavas), se usa el punto
 * interior de una rejilla más cercano al centroide.
 */
export function centroide(geometria: GeoJSON.Geometry): [number, number] | null {
  const poligonos = poligonosDe(geometria)
  if (poligonos.length === 0) return null

  const mayor = poligonos.reduce((a, b) => (Math.abs(areaAnillo(b[0])) > Math.abs(areaAnillo(a[0])) ? b : a))
  const c = centroideAnillo(mayor[0])
  if (puntoEnPoligono(c, mayor)) return c

  const xs = mayor[0].map((p) => p[0])
  const ys = mayor[0].map((p) => p[1])
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const pasos = 24
  let mejor: [number, number] | null = null
  let mejorDistancia = Infinity

  for (let i = 1; i < pasos; i++) {
    for (let j = 1; j < pasos; j++) {
      const p: [number, number] = [minX + ((maxX - minX) * i) / pasos, minY + ((maxY - minY) * j) / pasos]
      if (!puntoEnPoligono(p, mayor)) continue
      const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2
      if (d < mejorDistancia) {
        mejorDistancia = d
        mejor = p
      }
    }
  }

  return mejor ?? c
}

/** Caja envolvente [oeste, sur, este, norte] de una colección. */
export function cajaEnvolvente(coleccion: { features: { geometry: GeoJSON.Geometry }[] }): [number, number, number, number] | null {
  let oeste = Infinity
  let sur = Infinity
  let este = -Infinity
  let norte = -Infinity

  const visitar = (coordenadas: unknown): void => {
    if (typeof (coordenadas as number[])[0] === 'number') {
      const [x, y] = coordenadas as number[]
      oeste = Math.min(oeste, x)
      este = Math.max(este, x)
      sur = Math.min(sur, y)
      norte = Math.max(norte, y)
      return
    }
    for (const parte of coordenadas as unknown[]) visitar(parte)
  }

  for (const f of coleccion.features) {
    if ('coordinates' in f.geometry) visitar(f.geometry.coordinates)
  }

  return Number.isFinite(oeste) ? [oeste, sur, este, norte] : null
}

/** Radio mínimo (px) de las burbujas del mapa; la leyenda usa el mismo. */
export const RADIO_MINIMO_BURBUJA = 4

/** Radio de burbuja proporcional a la raíz cuadrada del valor (área ∝ valor). */
export function radioBurbuja(valor: number, maximo: number, minimo = 6, maximoPx = 36): number {
  if (valor <= 0 || maximo <= 0) return 0
  return minimo + (maximoPx - minimo) * Math.sqrt(valor / maximo)
}

/**
 * Tope del radio de burbuja (px) según nivel y ancho de pantalla: con la raíz
 * cuadrada, la mayor (Guatemala) llega al tope sin tapar a sus vecinas. A
 * nivel nacional, 20 px en escritorio deja a Guatemala y Sacatepéquez (las
 * más cercanas, ~30 px entre centroides) sin solaparse.
 */
export function radioMaximo(nivel: Nivel): number {
  const pequena = typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 639px)').matches
  return nivel === 'depto' ? (pequena ? 15 : 20) : pequena ? 14 : 20
}
