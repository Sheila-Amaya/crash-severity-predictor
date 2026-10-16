// Geometría de pantalla: espacio libre entre paneles y choques de etiquetas.

export type Lado = 'izquierda' | 'derecha' | 'arriba' | 'abajo'

export interface Caja {
  left: number
  top: number
  right: number
  bottom: number
}

export interface Margenes {
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * Márgenes del encuadre del mapa: el espacio libre que dejan los paneles
 * flotantes, según el lado al que pertenece cada uno. Los paneles ocultos
 * (tamaño 0) no cuentan. Un panel lateral bajo y pegado arriba (p. ej. plegado
 * a su cabecera) cuenta como superior. Si los márgenes dejaran menos del 35 %
 * del ancho o del alto, se reducen proporcionalmente.
 */
export function margenesLibres(
  contenedor: Caja,
  obstaculos: { lado: Lado; caja: Caja }[],
  separacion = 16,
): Margenes {
  const m: Margenes = { top: separacion, right: separacion, bottom: separacion, left: separacion }

  const altoContenedor = contenedor.bottom - contenedor.top

  for (const obstaculo of obstaculos) {
    const { caja } = obstaculo
    let { lado } = obstaculo
    if (caja.right - caja.left <= 0 || caja.bottom - caja.top <= 0) continue

    const bajo = caja.bottom - caja.top < altoContenedor * 0.2
    const arribaDelTodo = caja.top - contenedor.top < altoContenedor * 0.2
    if ((lado === 'izquierda' || lado === 'derecha') && bajo && arribaDelTodo) lado = 'arriba'

    if (lado === 'izquierda') m.left = Math.max(m.left, caja.right - contenedor.left + separacion)
    if (lado === 'derecha') m.right = Math.max(m.right, contenedor.right - caja.left + separacion)
    if (lado === 'arriba') m.top = Math.max(m.top, caja.bottom - contenedor.top + separacion)
    if (lado === 'abajo') m.bottom = Math.max(m.bottom, contenedor.bottom - caja.top + separacion)
  }

  const ancho = contenedor.right - contenedor.left
  const alto = contenedor.bottom - contenedor.top
  const ajustar = (a: number, b: number, total: number): [number, number] => {
    const maximo = total * 0.65
    if (a + b <= maximo) return [a, b]
    const f = maximo / (a + b)
    return [a * f, b * f]
  }

  ;[m.left, m.right] = ajustar(m.left, m.right, ancho)
  ;[m.top, m.bottom] = ajustar(m.top, m.bottom, alto)

  return m
}

export interface Etiqueta extends Caja {
  /** Burbuja propia (no cuenta como choque). */
  propia?: number
}

export interface Circulo {
  x: number
  y: number
  r: number
}

function chocaCirculo(caja: Caja, c: Circulo): boolean {
  const cx = Math.max(caja.left, Math.min(c.x, caja.right))
  const cy = Math.max(caja.top, Math.min(c.y, caja.bottom))
  return (cx - c.x) ** 2 + (cy - c.y) ** 2 < c.r ** 2
}

const chocanCajas = (a: Caja, b: Caja) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

/**
 * Qué etiquetas se muestran: se ocultan las que quedan bajo un panel (bloqueos),
 * chocan con una burbuja ajena o con una etiqueta ya colocada (en el orden
 * recibido, prioridad primero).
 */
export function etiquetasVisibles(etiquetas: Etiqueta[], circulos: Circulo[], bloqueos: Caja[] = []): boolean[] {
  const colocadas: Caja[] = []

  return etiquetas.map((etiqueta) => {
    const choca =
      bloqueos.some((b) => chocanCajas(etiqueta, b)) ||
      circulos.some((c, i) => i !== etiqueta.propia && chocaCirculo(etiqueta, c)) ||
      colocadas.some((otra) => chocanCajas(etiqueta, otra))

    if (!choca) colocadas.push(etiqueta)
    return !choca
  })
}
