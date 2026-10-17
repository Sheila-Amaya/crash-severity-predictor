import { useEffect, useState } from 'react'

import { usePrefiereMenosMovimiento } from '../../hooks/movimiento'

/**
 * Cuenta de 0 a `objetivo` una sola vez, al llegar el dato (ease-out). Con
 * prefers-reduced-motion, o sin requestAnimationFrame, muestra el valor final.
 */
export function useConteo(objetivo: number | undefined, duracion = 900): number | undefined {
  const reducido = usePrefiereMenosMovimiento()
  const sinAnimacion = reducido || typeof requestAnimationFrame === 'undefined'
  const [valor, setValor] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (objetivo === undefined || sinAnimacion) return
    const inicio = performance.now()
    let cuadro = 0
    const paso = (ahora: number) => {
      const progreso = Math.min(1, (ahora - inicio) / duracion)
      setValor(Math.round(objetivo * (1 - (1 - progreso) ** 3)))
      if (progreso < 1) cuadro = requestAnimationFrame(paso)
    }
    cuadro = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(cuadro)
  }, [objetivo, duracion, sinAnimacion])

  if (objetivo === undefined) return undefined
  return sinAnimacion ? objetivo : (valor ?? 0)
}
